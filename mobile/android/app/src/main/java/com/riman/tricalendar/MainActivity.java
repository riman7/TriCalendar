package com.riman.tricalendar;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.riman.tricalendar.plugins.CalendarEnginePlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CalendarEnginePlugin.class);
        super.onCreate(savedInstanceState);
    }
}