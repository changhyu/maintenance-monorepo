import React from 'react';
import { Box, useTheme } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Sample data for the fuel consumption chart
const data = [
  { name: '1월', consumption: 42 },
  { name: '2월', consumption: 37 },
  { name: '3월', consumption: 35 },
  { name: '4월', consumption: 34 },
  { name: '5월', consumption: 32 },
  { name: '6월', consumption: 30 },
  { name: '7월', consumption: 35 },
  { name: '8월', consumption: 33 },
  { name: '9월', consumption: 36 },
  { name: '10월', consumption: 38 },
  { name: '11월', consumption: 40 },
  { name: '12월', consumption: 45 },
];

const FuelConsumptionChart: React.FC = () => {
  const theme = useTheme();
  
  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
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
            formatter={(value) => [`${value} L/100km`, '연료 소비량']}
            labelFormatter={(value) => `${value}`}
          />
          <Legend />
          <Bar 
            dataKey="consumption" 
            name="연료 소비량 (L/100km)" 
            fill={theme.palette.error.main} 
          />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default FuelConsumptionChart;