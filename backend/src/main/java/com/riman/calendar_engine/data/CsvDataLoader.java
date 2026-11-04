package com.riman.calendar_engine.data;



import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.TreeMap;
import com.riman.calendar_engine.model.BsCalendarData;

public class CsvDataLoader {
    public static TreeMap<Integer, BsCalendarData> load() throws IOException {
        
        TreeMap<Integer, BsCalendarData> calendar = new TreeMap<>();

        InputStream input = CsvDataLoader.class.getResourceAsStream("/BsCalendarData.csv");
        if(input == null){
            throw new IOException("BsCalendarData.csv not found");
        }
        try(BufferedReader br = new BufferedReader(new InputStreamReader(input, StandardCharsets.UTF_8))){

            String line;

            // Skip CSV header
            br.readLine();

            while ((line = br.readLine()) != null) {

                line = line.trim();

                // Skip blank lines and comments
                if (line.isBlank() || line.startsWith("#")) {
                    continue;
                }


                String[] parts = line.split(",");

                if (parts.length != 14) {
                    throw new IOException("Invalid CSV row: " + line);
                }

                int year = Integer.parseInt(parts[0]);

                LocalDate newYearAD = LocalDate.parse(parts[1]);

                int[] monthDays = new int[12];

                for (int i = 0; i < 12; i++) {
                    monthDays[i] = Integer.parseInt(parts[i + 2]);
                }

                BsCalendarData data = new BsCalendarData(
                    year,
                    newYearAD,
                    monthDays
                );
                calendar.put(year, data);

        }
    }
            
        return calendar;
    }



}

