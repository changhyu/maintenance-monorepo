import React from 'react';
import { Box, useTheme } from '@mui/material';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Sample data for the speed analysis chart
const data = [
  { name: '00:00', average: 45, max: 68 },
  { name: '02:00', average: 35, max: 52 },
  { name: '04:00', average: 30, max: 40 },
  { name: '06:00', average: 50, max: 75 },
  { name: '08:00', average: 65, max: 85 },
  { name: '10:00', average: 60, max: 82 },
  { name: '12:00', average: 70, max: 95 },
  { name: '14:00', average: 65, max: 90 },
  { name: '16:00', average: 68, max: 88 },
  { name: '18:00', average: 72, max: 96 },
  { name: '20:00', average: 55, max: 80 },
  { name: '22:00', average: 48, max: 72 },
];

const SpeedAnalysisChart: React.FC = () => {
  const theme = useTheme();
  
  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
          <XAxis dataKey="name" stroke={theme.palette.text.secondary} />
          <YAxis stroke={theme.palette.text.secondary} />
          <Tooltip 
            contentStyle={{
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 4,
            }}
            formatter={(value) => [`${value} km/h`, undefined]}
          />
          <Legend />
          <Area 
            type="monotone" 
            dataKey="average" 
            name="평균 속도" 
            stroke={theme.palette.info.main} 
            fill={`${theme.palette.info.main}33`} 
          />
          <Area 
            type="monotone" 
            dataKey="max" 
            name="최대 속도" 
            stroke={theme.palette.primary.main} 
            fill={`${theme.palette.primary.main}33`} 
          />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default SpeedAnalysisChart;