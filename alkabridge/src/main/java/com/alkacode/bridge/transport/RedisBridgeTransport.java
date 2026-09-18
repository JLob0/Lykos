package com.alkacode.bridge.transport;

import com.alkacode.bridge.AlkaBridgePlugin;
import com.alkacode.bridge.config.BridgeConfig;
import com.alkacode.bridge.contract.CapabilityPayload;
import com.alkacode.bridge.contract.HeartbeatPayload;
import com.alkacode.bridge.security.HmacSigner;
import com.google.gson.Gson;
import java.net.URI;
import java.time.Instant;
import java.util.Map;
import org.apache.commons.pool2.impl.GenericObjectPoolConfig;
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;
import redis.clients.jedis.StreamEntryID;

public final class RedisBridgeTransport implements BridgeTransport {

    private static final String HEARTBEAT_SCHEMA = "heartbeat.v1";
    private static final String CAPABILITIES_SCHEMA = "capabilities.v1";

    private final AlkaBridgePlugin plugin;
    private final BridgeConfig config;
    private final Gson gson = new Gson();
    private final HmacSigner signer = new HmacSigner();
    private final JedisPool pool;

    public RedisBridgeTransport(AlkaBridgePlugin plugin, BridgeConfig config) {
        this.plugin = plugin;
        this.config = config;
        this.pool = createPool(config.redisUrl());

        try (Jedis jedis = pool.getResource()) {
            jedis.ping();
        }

        plugin.getLogger().info("[AlkaBridge] Transporte Redis conectado para serverId=" + config.serverId() + ".");
    }

    @Override
    public void publishHeartbeat(HeartbeatPayload payload) {
        String message = signedMessage(HEARTBEAT_SCHEMA, payload);
        try (Jedis jedis = pool.getResource()) {
            jedis.setex(config.heartbeatKeyPrefix() + ":" + payload.serverId(), config.heartbeatTtlSeconds(), message);
            jedis.xadd(config.eventStream(), StreamEntryID.NEW_ENTRY, Map.of(
                    "type", "server.heartbeat",
                    "serverId", payload.serverId(),
                    "message", message
            ));
        } catch (Exception ex) {
            plugin.getLogger().warning("[AlkaBridge] Falha ao publicar heartbeat no Redis: " + ex.getMessage());
        }
    }

    @Override
    public void publishCapabilities(CapabilityPayload payload) {
        String message = signedMessage(CAPABILITIES_SCHEMA, payload);
        try (Jedis jedis = pool.getResource()) {
            jedis.setex(config.capabilitiesKeyPrefix() + ":" + payload.serverId(), config.capabilitiesTtlSeconds(), message);
            jedis.xadd(config.eventStream(), StreamEntryID.NEW_ENTRY, Map.of(
                    "type", "server.capabilities",
                    "serverId", payload.serverId(),
                    "message", message
            ));
        } catch (Exception ex) {
            plugin.getLogger().warning("[AlkaBridge] Falha ao publicar capabilities no Redis: " + ex.getMessage());
        }
    }

    @Override
    public void close() {
        pool.close();
    }

    private String signedMessage(String schema, Object payload) {
        String payloadJson = gson.toJson(payload);
        SignedRedisMessage message = new SignedRedisMessage(
                schema,
                payloadJson,
                signer.sign(payloadJson, config.hmacSecret()),
                Instant.now().toString()
        );
        return gson.toJson(message);
    }

    private JedisPool createPool(String redisUrl) {
        GenericObjectPoolConfig<Jedis> poolConfig = new GenericObjectPoolConfig<>();
        poolConfig.setMaxTotal(8);
        poolConfig.setMaxIdle(4);
        poolConfig.setMinIdle(0);
        poolConfig.setTestOnBorrow(true);
        return new JedisPool(poolConfig, URI.create(redisUrl), 2_000);
    }
}

