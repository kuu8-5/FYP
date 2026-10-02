package com.hkmu.blockly.controller;

import java.time.Instant;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class HelloWorldController {

    @GetMapping("/hello")
    public Map<String, Object> hello(Authentication authentication) {
        return Map.of(
                "message", "Hello World from Spring Boot",
                "user", authentication.getName(),
                "timestamp", Instant.now().toString()
        );
    }

    @PostMapping("/echo")
    public Map<String, Object> echo(@RequestBody(required = false) Map<String, Object> body) {
        return Map.of(
                "received", body == null ? Map.of() : body,
                "timestamp", Instant.now().toString()
        );
    }
}
