package com.alkacode.bridge.command;

import com.alkacode.bridge.AlkaBridgePlugin;
import com.alkacode.bridge.config.BridgeConfig;
import com.alkacode.bridge.heartbeat.HeartbeatService;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.command.TabCompleter;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

public final class AlkaBridgeCommand implements CommandExecutor, TabCompleter {

    private final AlkaBridgePlugin plugin;

    public AlkaBridgeCommand(AlkaBridgePlugin plugin) {
        this.plugin = plugin;
    }

    @Override
    public boolean onCommand(@NotNull CommandSender sender, @NotNull Command command, @NotNull String label, @NotNull String[] args) {
        if (!sender.hasPermission("alkabridge.admin")) {
            sender.sendMessage("[AlkaBridge] Sem permissao.");
            return true;
        }

        String action = args.length == 0 ? "status" : args[0].toLowerCase();
        switch (action) {
            case "status" -> sendStatus(sender);
            case "reload" -> {
                plugin.reloadBridge();
                sender.sendMessage("[AlkaBridge] Configuracao recarregada.");
            }
            default -> sender.sendMessage("[AlkaBridge] Use /" + label + " <status|reload>.");
        }

        return true;
    }

    @Override
    public @Nullable List<String> onTabComplete(@NotNull CommandSender sender, @NotNull Command command, @NotNull String label, @NotNull String[] args) {
        if (!sender.hasPermission("alkabridge.admin") || args.length != 1) {
            return List.of();
        }

        String prefix = args[0].toLowerCase();
        List<String> suggestions = new ArrayList<>();
        for (String option : List.of("status", "reload")) {
            if (option.startsWith(prefix)) {
                suggestions.add(option);
            }
        }
        return suggestions;
    }

    private void sendStatus(CommandSender sender) {
        BridgeConfig config = plugin.getBridgeConfig();
        HeartbeatService heartbeat = plugin.getHeartbeatService();
        Instant lastHeartbeat = heartbeat == null ? null : heartbeat.getLastHeartbeatAt();

        sender.sendMessage("[AlkaBridge] serverId=" + config.serverId() + " displayName=" + config.displayName());
        sender.sendMessage("[AlkaBridge] environment=" + config.environment() + " transport=" + (config.transportEnabled() ? "enabled" : "disabled"));
        sender.sendMessage("[AlkaBridge] heartbeat=" + (config.heartbeatEnabled() ? "enabled" : "disabled") + " intervalTicks=" + config.heartbeatIntervalTicks());
        sender.sendMessage("[AlkaBridge] lastHeartbeat=" + (lastHeartbeat == null ? "never" : lastHeartbeat));
    }
}

