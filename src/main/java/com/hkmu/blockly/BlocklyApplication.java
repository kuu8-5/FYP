package com.hkmu.blockly;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration;

@SpringBootApplication(exclude = {
        DataSourceAutoConfiguration.class
})
public class BlocklyApplication {

    public static void main(String[] args) {
        SpringApplication.run(BlocklyApplication.class, args);
    }

}
