package com.alkacode.bridge.contract;

import java.util.List;

public record CommandActor(
        String discordUserId,
        String staffMemberId,
        List<String> permissionsSnapshot
) {
}
