package com.alkacode.bridge.transport;

import com.alkacode.bridge.contract.CommandResultPayload;

public interface CommandCapableTransport extends BridgeTransport {

    SignedRedisMessage takeCommand(int timeoutSeconds);

    boolean verifySignedMessage(SignedRedisMessage message);

    void publishCommandResult(CommandResultPayload payload);
}
