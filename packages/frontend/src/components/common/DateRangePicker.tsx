import React from 'react';
import { Box } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import ko from 'date-fns/locale/ko';

interface DateRangePickerProps {
  value: [Date | null, Date | null];
  onChange: (value: [Date | null, Date | null]) => void;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value,
  onChange,
  disabled = false,
  error = false,
  helperText,
}) => {
  const [startDate, endDate] = value;

  const handleStartDateChange = (date: Date | null) => {
    if (endDate && date && date > endDate) {
      onChange([endDate, date]);
    } else {
      onChange([date, endDate]);
    }
  };

  const handleEndDateChange = (date: Date | null) => {
    if (startDate && date && date < startDate) {
      onChange([date, startDate]);
    } else {
      onChange([startDate, date]);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ko}>
      <Box display="flex" gap={2}>
        <DatePicker
          label="시작일"
          value={startDate}
          onChange={handleStartDateChange}
          disabled={disabled}
          slotProps={{
            textField: {
              fullWidth: true,
              error,
              helperText,
            },
          }}
        />
        <DatePicker
          label="종료일"
          value={endDate}
          onChange={handleEndDateChange}
          disabled={disabled}
          minDate={startDate || undefined}
          slotProps={{
            textField: {
              fullWidth: true,
              error,
              helperText,
            },
          }}
        />
      </Box>
    </LocalizationProvider>
  );
};

export default DateRangePicker;
