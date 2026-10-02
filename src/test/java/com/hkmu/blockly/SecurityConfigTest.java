package com.hkmu.blockly;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
class SecurityConfigTest {

    @Autowired
    private MockMvc mockMvc;

    private MockHttpSession login() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .param("username", "user")
                        .param("password", "password"))
                .andExpect(status().isOk())
                .andReturn();
        return (MockHttpSession) result.getRequest().getSession(false);
    }

    @Test
    void anonymousRequestIsRejected() throws Exception {
        mockMvc.perform(get("/api/hello"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void loginWithWrongPasswordIsRejected() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .param("username", "user")
                        .param("password", "wrong"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void loginAllowsAccessToProtectedApis() throws Exception {
        MockHttpSession session = login();

        mockMvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("user"));

        mockMvc.perform(get("/api/hello").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Hello World from Spring Boot"))
                .andExpect(jsonPath("$.user").value("user"));
    }

    @Test
    void echoReturnsPostedJson() throws Exception {
        MockHttpSession session = login();

        mockMvc.perform(post("/api/echo")
                        .session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"hi\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.received.message").value("hi"));
    }

    @Test
    void logoutInvalidatesSession() throws Exception {
        MockHttpSession session = login();

        mockMvc.perform(post("/api/auth/logout").session(session))
                .andExpect(status().isOk());

        assertTrue(session.isInvalid());
    }
}
