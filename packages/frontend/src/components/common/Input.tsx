import React, { forwardRef } from 'react';
import { TextField, TextFieldProps, InputAdornment, useTheme } from '@mui/material';
import { styled } from '@mui/material/styles';

/**
 * 입력 필드 크기 타입 정의
 */
export type InputSize = 'sm' | 'md' | 'lg';

/**
 * 입력 필드 변형 타입 정의
 */
export type InputVariant = 'outline' | 'filled' | 'flushed';

export interface InputProps extends Omit<TextFieldProps, 'variant'> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isFullWidth?: boolean;
  isInvalid?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  helperText?: string;
  errorText?: string;
}

const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    transition: theme.transitions.create(['border-color', 'box-shadow', 'background-color']),
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
    '&.Mui-focused': {
      backgroundColor: theme.palette.background.paper,
      boxShadow: `0 0 0 2px ${theme.palette.primary.main}1f`,
    },
    '&.Mui-disabled': {
      backgroundColor: theme.palette.action.disabledBackground,
    },
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderWidth: 1.5,
  },
  '& .MuiInputLabel-root': {
    '&.Mui-focused': {
      color: theme.palette.text.primary,
    },
  },
  '& .MuiInputAdornment-root': {
    color: theme.palette.text.secondary,
  },
}));

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      leftIcon,
      rightIcon,
      isFullWidth = false,
      isInvalid = false,
      isDisabled = false,
      isReadOnly = false,
      helperText,
      errorText,
      InputProps,
      ...rest
    },
    ref
  ) => {
    const theme = useTheme();

    const inputProps = {
      ...InputProps,
      readOnly: isReadOnly,
      startAdornment: leftIcon && (
        <InputAdornment position="start">{leftIcon}</InputAdornment>
      ),
      endAdornment: rightIcon && <InputAdornment position="end">{rightIcon}</InputAdornment>,
    };

    return (
      <StyledTextField
        {...rest}
        ref={ref}
        variant="outlined"
        fullWidth={isFullWidth}
        disabled={isDisabled}
        error={isInvalid}
        helperText={isInvalid ? errorText : helperText}
        InputProps={inputProps}
        sx={{
          ...rest.sx,
          '& .MuiOutlinedInput-root': {
            borderRadius: 1,
          },
        }}
      />
    );
  }
);

Input.displayName = 'Input';
