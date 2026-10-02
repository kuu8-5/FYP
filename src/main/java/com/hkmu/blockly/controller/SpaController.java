package com.hkmu.blockly.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SpaController {

    @GetMapping({"/login", "/page1", "/page2"})
    public String index() {
        return "forward:/index.html";
    }
}
