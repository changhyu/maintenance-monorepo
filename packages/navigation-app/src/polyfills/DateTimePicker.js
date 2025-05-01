/**
 * React Native DateTimePicker 폴리필
 * 웹 환경에서 기본 HTML input 요소를 사용하여 날짜/시간 선택 기능을 제공합니다.
 */

import React from 'react';

// 상수 정의
export const MODE_DATE = 'date';
export const MODE_TIME = 'time';
export const MODE_DATETIME = 'datetime';
export const DISPLAY_DEFAULT = 'default';
export const DISPLAY_SPINNER = 'spinner';
export const DISPLAY_CALENDAR = 'calendar';
export const DISPLAY_CLOCK = 'clock';
export const ANDROID_MODE_CLOCK = 'clock';
export const ANDROID_MODE_SPINNER = 'spinner';
export const ANDROID_MODE_DEFAULT = 'default';
export const DAY_OF_WEEK_SYMBOLS = ["S", "M", "T", "W", "T", "F", "S"];
export const WEEK_NUMBER_NAMES = ["1", "2", "3", "4", "5", "6"];

// React Native DateTimePicker 웹 구현
const DateTimePicker = (props) => {
  const {
    value = new Date(),
    mode = MODE_DATE,
    display = DISPLAY_DEFAULT,
    onChange,
    style = {},
    disabled = false,
    themeVariant,
    is24Hour = false,
    minimumDate,
    maximumDate,
    minuteInterval = 1,
    testID,
  } = props;

  // 날짜를 ISO 문자열로 변환 (YYYY-MM-DD)
  const formatDateForInput = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 시간을 ISO 문자열로 변환 (HH:MM)
  const formatTimeForInput = (date) => {
    if (!date) return '';
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // 사용자 입력 처리
  const handleChange = (e) => {
    if (onChange) {
      const selectedValue = e.target.value;
      const currentDate = new Date(value);
      
      let newDate;
      if (mode === MODE_DATE) {
        newDate = new Date(selectedValue);
      } else if (mode === MODE_TIME) {
        const [hours, minutes] = selectedValue.split(':');
        newDate = new Date(currentDate);
        newDate.setHours(parseInt(hours, 10));
        newDate.setMinutes(parseInt(minutes, 10));
      }
      
      // onChange 이벤트 호출
      onChange({
        type: 'set',
        nativeEvent: {
          timestamp: newDate.getTime(),
          utcOffset: newDate.getTimezoneOffset() * -1,
        }
      }, newDate);
    }
  };

  // 웹 환경에서 적절한 입력 타입 선택
  const inputType = mode === MODE_DATE ? 'date' : mode === MODE_TIME ? 'time' : 'datetime-local';
  const inputValue = mode === MODE_DATE 
    ? formatDateForInput(value) 
    : mode === MODE_TIME 
      ? formatTimeForInput(value)
      : `${formatDateForInput(value)}T${formatTimeForInput(value)}`;
  
  // 최소/최대 날짜 설정
  const minDateAttr = minimumDate ? formatDateForInput(minimumDate) : undefined;
  const maxDateAttr = maximumDate ? formatDateForInput(maximumDate) : undefined;

  // 웹 환경에 맞는 인라인 스타일
  const webStyle = {
    padding: '8px',
    fontSize: '16px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    ...style,
  };

  // React Native와 유사한 접근성 속성 설정
  const accessibilityProps = {
    'aria-label': props['aria-label'] || `Select ${mode}`,
    'aria-disabled': disabled,
  };

  return React.createElement('input', {
    type: inputType,
    value: inputValue,
    onChange: handleChange,
    style: webStyle,
    disabled,
    min: minDateAttr,
    max: maxDateAttr,
    step: mode === MODE_TIME ? minuteInterval * 60 : undefined,
    'data-testid': testID,
    ...accessibilityProps,
  });
};

export default DateTimePicker;