import React from 'react';
import { Box, useTheme } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Sample data for the mileage chart
const data = [
  { name: '1월', mileage: 4000 },
  { name: '2월', mileage: 3000 },
  { name: '3월', mileage: 2000 },
  { name: '4월', mileage: 2780 },
  { name: '5월', mileage: 1890 },
  { name: '6월', mileage: 2390 },
  { name: '7월', mileage: 3490 },
  { name: '8월', mileage: 2940 },
  { name: '9월', mileage: 3240 },
  { name: '10월', mileage: 2780 },
  { name: '11월', mileage: 3830 },
  { name: '12월', mileage: 4200 },
];

const MileageChart: React.FC = () => {
  const theme = useTheme();
  
  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
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
            formatter={(value) => [`${value} km`, '주행 거리']}
            labelFormatter={(value) => `${value}`}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="mileage"
            name="주행 거리 (km)"
            stroke={theme.palette.primary.main}
            activeDot={{ r: 8 }}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default MileageChart;