import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from 'react';
import { TextField, InputAdornment, useTheme } from '@mui/material';
import { styled } from '@mui/material/styles';
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
export const Input = forwardRef(({ leftIcon, rightIcon, isFullWidth = false, isInvalid = false, isDisabled = false, isReadOnly = false, helperText, errorText, InputProps, ...rest }, ref) => {
    const theme = useTheme();
    const inputProps = {
        ...InputProps,
        readOnly: isReadOnly,
        startAdornment: leftIcon && (_jsx(InputAdornment, { position: "start", children: leftIcon })),
        endAdornment: rightIcon && _jsx(InputAdornment, { position: "end", children: rightIcon }),
    };
    return (_jsx(StyledTextField, { ...rest, ref: ref, variant: "outlined", fullWidth: isFullWidth, disabled: isDisabled, error: isInvalid, helperText: isInvalid ? errorText : helperText, InputProps: inputProps, sx: {
            ...rest.sx,
            '& .MuiOutlinedInput-root': {
                borderRadius: 1,
            },
        } }));
});
Input.displayName = 'Input';
