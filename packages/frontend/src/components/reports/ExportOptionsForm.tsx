import React, { useState } from 'react';
import {
  Box,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Checkbox,
  Button,
  Grid,
  MenuItem,
  Select,
  Typography,
  Paper
} from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';

import { ReportFormat, ExportOptions } from '../../services/reportService';

interface ExportOptionsFormProps {
  onExport: (options: ExportOptions) => void;
  isLoading?: boolean;
  multipleReports?: boolean;
}

/**
 * 보고서 내보내기 옵션 폼 컴포넌트
 */
const ExportOptionsForm: React.FC<ExportOptionsFormProps> = ({
  onExport,
  isLoading = false,
  multipleReports = false
}) => {
  // 내보내기 옵션 상태
  const [options, setOptions] = useState<ExportOptions>({
    format: ReportFormat.PDF,
    includeCharts: true,
    includeRawData: true,
    paperSize: 'a4',
    landscape: false,
    saveToIndexedDB: false
  });

  // 옵션 변경 핸들러
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked, type } = e.target;
    setOptions(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // 내보내기 형식 변경 핸들러
  const handleFormatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const format = e.target.value as ReportFormat;
    setOptions(prev => ({
      ...prev,
      format
    }));
  };

  // 내보내기 실행 핸들러
  const handleExport = () => {
    onExport(options);
  };

  return (
    <Paper elevation={2} sx={{ p: 3, maxWidth: '600px', mx: 'auto', my: 2 }}>
      <Typography variant="h6" gutterBottom>
        보고서 내보내기 옵션
      </Typography>

      <Grid container spacing={3}>
        {/* 내보내기 형식 */}
        <Grid size={{ xs: 12 }}>
          <FormControl component="fieldset">
            <FormLabel component="legend">내보내기 형식</FormLabel>
            <RadioGroup
              row
              name="format"
              value={options.format}
              onChange={handleFormatChange}
            >
              <FormControlLabel
                value={ReportFormat.PDF}
                control={<Radio />}
                label="PDF"
              />
              <FormControlLabel
                value={ReportFormat.EXCEL}
                control={<Radio />}
                label="Excel"
              />
              <FormControlLabel
                value={ReportFormat.CSV}
                control={<Radio />}
                label="CSV"
              />
              <FormControlLabel
                value={ReportFormat.JSON}
                control={<Radio />}
                label="JSON"
              />
            </RadioGroup>
          </FormControl>
        </Grid>

        {/* PDF 관련 옵션 */}
        {options.format === ReportFormat.PDF && (
          <>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth variant="outlined">
                <FormLabel component="legend">용지 크기</FormLabel>
                <Select
                  name="paperSize"
                  value={options.paperSize}
                  onChange={handleChange as any}
                >
                  <MenuItem value="a4">A4</MenuItem>
                  <MenuItem value="letter">Letter</MenuItem>
                  <MenuItem value="legal">Legal</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl component="fieldset">
                <FormLabel component="legend">방향</FormLabel>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={options.landscape}
                      onChange={handleChange}
                      name="landscape"
                    />
                  }
                  label="가로 방향"
                />
              </FormControl>
            </Grid>
          </>
        )}

        {/* 차트 및 원본 데이터 포함 옵션 */}
        <Grid size={{ xs: 12 }}>
          <FormControl component="fieldset">
            <FormLabel component="legend">포함 항목</FormLabel>
            <FormControlLabel
              control={
                <Checkbox
                  checked={options.includeCharts}
                  onChange={handleChange}
                  name="includeCharts"
                />
              }
              label="차트 포함"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={options.includeRawData}
                  onChange={handleChange}
                  name="includeRawData"
                />
              }
              label="원본 데이터 포함"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={options.saveToIndexedDB}
                  onChange={handleChange}
                  name="saveToIndexedDB"
                />
              }
              label="IndexedDB에 저장 (오프라인 조회용)"
            />
          </FormControl>
        </Grid>

        {/* 내보내기 버튼 */}
        <Grid size={{ xs: 12 }}>
          <Box display="flex" justifyContent="flex-end">
            <Button
              variant="contained"
              color="primary"
              startIcon={<DownloadIcon />}
              onClick={handleExport}
              disabled={isLoading}
            >
              {isLoading
                ? '내보내는 중...'
                : multipleReports
                ? '선택한 보고서 내보내기'
                : '보고서 내보내기'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default ExportOptionsForm; 