import com.github.jengelman.gradle.plugins.shadow.tasks.ShadowJar

plugins {
    java
    id("com.gradleup.shadow") version "8.3.5"
}

group = "com.alkacode"
version = "0.1.0"

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(21))
    }
}

dependencies {
    compileOnly("io.papermc.paper:paper-api:1.21.8-R0.1-SNAPSHOT")
    compileOnly("com.alkacode:AlkaCore:1.0.11")
    implementation("redis.clients:jedis:5.1.3")

    testImplementation("org.junit.jupiter:junit-jupiter:5.10.2")
}

tasks.withType<JavaCompile> {
    options.encoding = "UTF-8"
    options.release.set(21)
}

tasks.withType<Test> {
    useJUnitPlatform()
}

tasks.named<ShadowJar>("shadowJar") {
    archiveClassifier.set("")
    relocate("redis.clients.jedis", "com.alkacode.bridge.libs.jedis")
    relocate("org.apache.commons.pool2", "com.alkacode.bridge.libs.pool2")
    relocate("org.json", "com.alkacode.bridge.libs.json")
}

tasks.build {
    dependsOn(tasks.shadowJar)
}

tasks.processResources {
    filteringCharset = "UTF-8"
    inputs.property("version", project.version)
    filesMatching("plugin.yml") {
        expand("version" to project.version)
    }
}
