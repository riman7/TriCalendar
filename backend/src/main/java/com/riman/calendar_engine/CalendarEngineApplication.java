package com.riman.calendar_engine;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

import com.riman.calendar_engine.converter.BsAdConverter;

@SpringBootApplication
public class CalendarEngineApplication {

	public static void main(String[] args) {
		SpringApplication.run(CalendarEngineApplication.class, args);
	}

	@Bean
    CommandLineRunner testConverter() {
        return args -> {
            BsAdConverter converter = new BsAdConverter();

            System.out.println("BS to AD:");
            System.out.println(converter.bsToAd(2083, 1, 1));

            System.out.println("AD to BS:");
            System.out.println(converter.adToBs(
                java.time.LocalDate.of(2026, 4, 14)
            ));
        };
    }

}
