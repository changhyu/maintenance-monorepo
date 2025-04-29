import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import styled from 'styled-components';
import { Card, Typography, IconButton, Skeleton, Tooltip, Zoom, Menu, MenuItem, Collapse, useTheme, CircularProgress, Alert } from '@mui/material';
import { DragIndicator as DragIndicatorIcon, MoreVert as MoreVertIcon, Refresh as RefreshIcon, Fullscreen as FullscreenIcon, Close as CloseIcon } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
export var WidgetStatus;
(function (WidgetStatus) {
    WidgetStatus["IDLE"] = "idle";
    WidgetStatus["LOADING"] = "loading";
    WidgetStatus["ERROR"] = "error";
    WidgetStatus["SUCCESS"] = "success";
})(WidgetStatus || (WidgetStatus = {}));
const Container = styled.div `
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 1rem;
  width: 100%;
  padding: 1rem;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(8, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;
const WidgetWrapper = styled(motion.div) `
  grid-column: span ${props => {
    switch (props.$width) {
        case 'full':
            return '12';
        case 'half':
            return '6';
        case 'third':
            return '4';
        default:
            return '6';
    }
}};

  @media (max-width: 1024px) {
    grid-column: span ${props => {
    switch (props.$width) {
        case 'full':
            return '8';
        case 'half':
        case 'third':
            return '4';
        default:
            return '4';
    }
}};
  }

  @media (max-width: 768px) {
    grid-column: span 4;
  }
`;
const StyledCard = styled(Card) `
  height: 100%;
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
  background-color: ${props => props.$customStyle?.backgroundColor};
  border-color: ${props => props.$customStyle?.borderColor};
  border-radius: ${props => props.$customStyle?.borderRadius}px;
  padding: ${props => props.$customStyle?.padding};
  box-shadow: ${props => props.$customStyle?.elevation && `0 ${props.$customStyle.elevation}px ${props.$customStyle.elevation * 2}px rgba(0,0,0,0.1)`};

  &:hover {
    transform: translateY(-2px);
  }
`;
const DragHandle = styled.div `
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  background-color: ${props => props.$customStyle?.backgroundColor};
  color: ${props => props.$customStyle?.headerColor};
`;
const HeaderActions = styled.div `
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;
const ContentWrapper = styled.div `
  padding: ${props => props.$customStyle?.padding || '1rem'};
  background-color: ${props => props.$customStyle?.backgroundColor};
`;
const StatusContainer = styled.div `
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
`;
const DashboardLayout = ({ widgets, onLayoutChange, isLoading = false, className, animationEnabled = true, onWidgetClose, onWidgetRefresh, defaultCollapsed = false }) => {
    const [items, setItems] = useState(widgets);
    const [collapsedWidgets, setCollapsedWidgets] = useState(widgets.reduce((acc, widget) => ({
        ...acc,
        [widget.id]: defaultCollapsed
    }), {}));
    const [menuAnchor, setMenuAnchor] = useState({});
    const [fullscreenWidget, setFullscreenWidget] = useState(null);
    const theme = useTheme();
    useEffect(() => {
        // 자동 새로고침 설정
        const intervals = [];
        items.forEach(widget => {
            if (widget.refreshInterval && widget.onRefresh) {
                const interval = setInterval(() => {
                    widget.onRefresh?.();
                }, widget.refreshInterval);
                intervals.push(interval);
            }
        });
        return () => {
            intervals.forEach(interval => clearInterval(interval));
        };
    }, [items]);
    const handleDragEnd = (result) => {
        if (!result.destination)
            return;
        const newItems = Array.from(items);
        const [reorderedItem] = newItems.splice(result.source.index, 1);
        newItems.splice(result.destination.index, 0, reorderedItem);
        setItems(newItems);
        if (onLayoutChange) {
            onLayoutChange(newItems);
        }
    };
    const handleMenuOpen = (event, widgetId) => {
        setMenuAnchor(prev => ({
            ...prev,
            [widgetId]: event.currentTarget
        }));
    };
    const handleMenuClose = (widgetId) => {
        setMenuAnchor(prev => ({
            ...prev,
            [widgetId]: null
        }));
    };
    const handleWidgetCollapse = (widgetId) => {
        setCollapsedWidgets(prev => ({
            ...prev,
            [widgetId]: !prev[widgetId]
        }));
    };
    const handleWidgetRefresh = async (widgetId) => {
        if (onWidgetRefresh) {
            await onWidgetRefresh(widgetId);
        }
    };
    const handleWidgetFullscreen = (widgetId) => {
        setFullscreenWidget(prev => prev === widgetId ? null : widgetId);
    };
    const handleWidgetClose = (widgetId) => {
        if (onWidgetClose) {
            onWidgetClose(widgetId);
        }
    };
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };
    const itemVariants = {
        hidden: {
            opacity: 0,
            y: 20,
            scale: 0.95
        },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                type: 'spring',
                stiffness: 100,
                damping: 15
            }
        }
    };
    if (isLoading) {
        return (_jsx(Container, { className: className, children: _jsx(AnimatePresence, { children: [1, 2, 3, 4].map((item) => (_jsx(WidgetWrapper, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, scale: 0.95 }, transition: { duration: 0.3 }, children: _jsx(StyledCard, { children: _jsx(Skeleton, { variant: "rectangular", height: 200 }) }) }, item))) }) }));
    }
    return (_jsx(DragDropContext, { onDragEnd: handleDragEnd, children: _jsx(Droppable, { droppableId: "dashboard", direction: "horizontal", children: (provided) => (_jsxs(Container, { ref: provided.innerRef, ...provided.droppableProps, className: className, as: motion.div, variants: containerVariants, initial: "hidden", animate: "visible", children: [_jsx(AnimatePresence, { children: items.map((item, index) => (_jsx(Draggable, { draggableId: item.id, index: index, children: (providedDrag) => (_jsx(WidgetWrapper, { ref: providedDrag.innerRef, ...providedDrag.draggableProps, "$width": fullscreenWidget === item.id ? 'full' : item.width, variants: itemVariants, initial: "hidden", animate: "visible", exit: { opacity: 0, scale: 0.95 }, whileHover: { scale: animationEnabled ? 1.02 : 1 }, whileTap: { scale: animationEnabled ? 0.98 : 1 }, style: {
                                    zIndex: fullscreenWidget === item.id ? 1000 : 1,
                                    gridColumn: fullscreenWidget === item.id ? '1 / -1' : undefined
                                }, children: _jsxs(StyledCard, { "$customStyle": item.style, children: [_jsx(Tooltip, { title: item.description || '', placement: "top", TransitionComponent: Zoom, arrow: true, children: _jsxs(DragHandle, { ...providedDrag.dragHandleProps, "$customStyle": item.headerStyle, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '0.5rem' }, children: [_jsx(DragIndicatorIcon, { fontSize: "small" }), _jsx(Typography, { variant: "subtitle1", component: "h3", children: item.title })] }), _jsxs(HeaderActions, { children: [item.isRefreshable && (_jsx(IconButton, { size: "small", onClick: () => handleWidgetRefresh(item.id), children: _jsx(RefreshIcon, { fontSize: "small" }) })), item.isFullscreenable && (_jsx(IconButton, { size: "small", onClick: () => handleWidgetFullscreen(item.id), children: _jsx(FullscreenIcon, { fontSize: "small" }) })), (item.actions && item.actions.length > 0 || item.isCollapsible) && (_jsxs(_Fragment, { children: [_jsx(IconButton, { size: "small", onClick: (e) => handleMenuOpen(e, item.id), children: _jsx(MoreVertIcon, { fontSize: "small" }) }), _jsxs(Menu, { anchorEl: menuAnchor[item.id], open: Boolean(menuAnchor[item.id]), onClose: () => handleMenuClose(item.id), children: [item.isCollapsible && (_jsx(MenuItem, { onClick: () => handleWidgetCollapse(item.id), children: collapsedWidgets[item.id] ? '펼치기' : '접기' })), item.actions?.map((action, actionIndex) => (_jsxs(MenuItem, { onClick: action.onClick, disabled: action.disabled, children: [action.icon && (_jsx("span", { style: { marginRight: '0.5rem' }, children: action.icon })), action.label] }, actionIndex)))] })] })), item.isCloseable && (_jsx(IconButton, { size: "small", onClick: () => handleWidgetClose(item.id), children: _jsx(CloseIcon, { fontSize: "small" }) }))] })] }) }), _jsx(Collapse, { in: !collapsedWidgets[item.id], children: _jsxs(ContentWrapper, { "$customStyle": item.contentStyle, children: [item.status === WidgetStatus.LOADING && (_jsxs(StatusContainer, { children: [_jsx(CircularProgress, { size: 24 }), item.loadingMessage && (_jsx(Typography, { variant: "body2", sx: { ml: 1 }, children: item.loadingMessage }))] })), item.status === WidgetStatus.ERROR && (_jsx(Alert, { severity: "error", sx: { mb: 2 }, children: item.errorMessage || '오류가 발생했습니다.' })), item.content] }) })] }) })) }, item.id))) }), provided.placeholder] })) }) }));
};
export default DashboardLayout;
