package com.alkacode.bridge.transport;

import com.alkacode.bridge.contract.CapabilityPayload;
import com.alkacode.bridge.contract.HeartbeatPayload;

public interface BridgeTransport extends AutoCloseable {

    void publishHeartbeat(HeartbeatPayload payload);

    void publishCapabilities(CapabilityPayload payload);

    @Override
    void close();
}

