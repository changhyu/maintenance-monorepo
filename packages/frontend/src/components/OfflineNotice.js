import { jsx as _jsx } from "react/jsx-runtime";
import { Alert, Snackbar } from '@mui/material';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import { useTranslation } from 'react-i18next';
/**
 * 오프라인 상태를 알리는 알림 컴포넌트
 * 네트워크 연결이 끊어졌을 때 사용자에게 알려줍니다.
 */
const OfflineNotice = () => {
    const { t } = useTranslation();
    return (_jsx(Snackbar, { open: true, anchorOrigin: { vertical: 'top', horizontal: 'center' }, sx: { position: 'fixed', top: '0px', width: '100%' }, children: _jsx(Alert, { icon: _jsx(WifiOffIcon, {}), severity: "warning", variant: "filled", sx: {
                width: '100%',
                borderRadius: 0,
                justifyContent: 'center'
            }, children: t('notifications.offline') }) }));
};
export default OfflineNotice;
