import React, { useState, useCallback, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import styled from 'styled-components';
import {
  Card,
  Typography,
  IconButton,
  Skeleton,
  Tooltip,
  Zoom,
  Menu,
  MenuItem,
  Collapse,
  useTheme,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  DragIndicator as DragIndicatorIcon,
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Fullscreen as FullscreenIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

export enum WidgetStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  ERROR = 'error',
  SUCCESS = 'success'
}

export interface WidgetStyle {
  backgroundColor?: string;
  headerColor?: string;
  borderColor?: string;
  borderRadius?: number;
  elevation?: number;
  padding?: string | number;
}

export interface WidgetAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

interface Widget {
  id: string;
  content: React.ReactNode;
  title?: string;
  width?: 'full' | 'half' | 'third';
  description?: string;
  isCollapsible?: boolean;
  isRefreshable?: boolean;
  isFullscreenable?: boolean;
  isCloseable?: boolean;
  actions?: WidgetAction[];
  refreshInterval?: number;
  onRefresh?: () => Promise<void>;
  style?: WidgetStyle;
  headerStyle?: WidgetStyle;
  contentStyle?: WidgetStyle;
  status?: WidgetStatus;
  errorMessage?: string;
  loadingMessage?: string;
}

interface DashboardLayoutProps {
  widgets: Widget[];
  onLayoutChange?: (widgets: Widget[]) => void;
  isLoading?: boolean;
  className?: string;
  animationEnabled?: boolean;
  onWidgetClose?: (widgetId: string) => void;
  onWidgetRefresh?: (widgetId: string) => Promise<void>;
  defaultCollapsed?: boolean;
}

const Container = styled.div`
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

const WidgetWrapper = styled(motion.div)<{ $width?: Widget['width'] }>`
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

const StyledCard = styled(Card)<{ $customStyle?: WidgetStyle }>`
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

const DragHandle = styled.div<{ $customStyle?: WidgetStyle }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  background-color: ${props => props.$customStyle?.backgroundColor};
  color: ${props => props.$customStyle?.headerColor};
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ContentWrapper = styled.div<{ $customStyle?: WidgetStyle }>`
  padding: ${props => props.$customStyle?.padding || '1rem'};
  background-color: ${props => props.$customStyle?.backgroundColor};
`;

const StatusContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
`;

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  widgets,
  onLayoutChange,
  isLoading = false,
  className,
  animationEnabled = true,
  onWidgetClose,
  onWidgetRefresh,
  defaultCollapsed = false
}) => {
  const [items, setItems] = useState<Widget[]>(widgets);
  const [collapsedWidgets, setCollapsedWidgets] = useState<Record<string, boolean>>(
    widgets.reduce((acc, widget) => ({
      ...acc,
      [widget.id]: defaultCollapsed
    }), {})
  );
  const [menuAnchor, setMenuAnchor] = useState<Record<string, HTMLElement | null>>({});
  const [fullscreenWidget, setFullscreenWidget] = useState<string | null>(null);
  const theme = useTheme();

  useEffect(() => {
    // 자동 새로고침 설정
    const intervals: NodeJS.Timeout[] = [];
    
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

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);
    
    setItems(newItems);
    if (onLayoutChange) {
      onLayoutChange(newItems);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>, widgetId: string) => {
    setMenuAnchor(prev => ({
      ...prev,
      [widgetId]: event.currentTarget
    }));
  };

  const handleMenuClose = (widgetId: string) => {
    setMenuAnchor(prev => ({
      ...prev,
      [widgetId]: null
    }));
  };

  const handleWidgetCollapse = (widgetId: string) => {
    setCollapsedWidgets(prev => ({
      ...prev,
      [widgetId]: !prev[widgetId]
    }));
  };

  const handleWidgetRefresh = async (widgetId: string) => {
    if (onWidgetRefresh) {
      await onWidgetRefresh(widgetId);
    }
  };

  const handleWidgetFullscreen = (widgetId: string) => {
    setFullscreenWidget(prev => prev === widgetId ? null : widgetId);
  };

  const handleWidgetClose = (widgetId: string) => {
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
    return (
      <Container className={className}>
        <AnimatePresence>
          {[1, 2, 3, 4].map((item) => (
            <WidgetWrapper
              key={item}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <StyledCard>
                <Skeleton variant="rectangular" height={200} />
              </StyledCard>
            </WidgetWrapper>
          ))}
        </AnimatePresence>
      </Container>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="dashboard" direction="horizontal">
        {(provided) => (
          <Container
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={className}
            as={motion.div}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <AnimatePresence>
              {items.map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(providedDrag) => (
                    <WidgetWrapper
                      ref={providedDrag.innerRef}
                      {...providedDrag.draggableProps}
                      $width={fullscreenWidget === item.id ? 'full' : item.width}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      exit={{ opacity: 0, scale: 0.95 }}
                      whileHover={{ scale: animationEnabled ? 1.02 : 1 }}
                      whileTap={{ scale: animationEnabled ? 0.98 : 1 }}
                      style={{
                        zIndex: fullscreenWidget === item.id ? 1000 : 1,
                        gridColumn: fullscreenWidget === item.id ? '1 / -1' : undefined
                      }}
                    >
                      <StyledCard $customStyle={item.style}>
                        <Tooltip
                          title={item.description || ''}
                          placement="top"
                          TransitionComponent={Zoom}
                          arrow
                        >
                          <DragHandle {...providedDrag.dragHandleProps} $customStyle={item.headerStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <DragIndicatorIcon fontSize="small" />
                              <Typography variant="subtitle1" component="h3">
                                {item.title}
                              </Typography>
                            </div>
                            <HeaderActions>
                              {item.isRefreshable && (
                                <IconButton
                                  size="small"
                                  onClick={() => handleWidgetRefresh(item.id)}
                                >
                                  <RefreshIcon fontSize="small" />
                                </IconButton>
                              )}
                              {item.isFullscreenable && (
                                <IconButton
                                  size="small"
                                  onClick={() => handleWidgetFullscreen(item.id)}
                                >
                                  <FullscreenIcon fontSize="small" />
                                </IconButton>
                              )}
                              {(item.actions && item.actions.length > 0 || item.isCollapsible) && (
                                <>
                                  <IconButton
                                    size="small"
                                    onClick={(e) => handleMenuOpen(e, item.id)}
                                  >
                                    <MoreVertIcon fontSize="small" />
                                  </IconButton>
                                  <Menu
                                    anchorEl={menuAnchor[item.id]}
                                    open={Boolean(menuAnchor[item.id])}
                                    onClose={() => handleMenuClose(item.id)}
                                  >
                                    {item.isCollapsible && (
                                      <MenuItem onClick={() => handleWidgetCollapse(item.id)}>
                                        {collapsedWidgets[item.id] ? '펼치기' : '접기'}
                                      </MenuItem>
                                    )}
                                    {item.actions?.map((action, actionIndex) => (
                                      <MenuItem
                                        key={actionIndex}
                                        onClick={action.onClick}
                                        disabled={action.disabled}
                                      >
                                        {action.icon && (
                                          <span style={{ marginRight: '0.5rem' }}>
                                            {action.icon}
                                          </span>
                                        )}
                                        {action.label}
                                      </MenuItem>
                                    ))}
                                  </Menu>
                                </>
                              )}
                              {item.isCloseable && (
                                <IconButton
                                  size="small"
                                  onClick={() => handleWidgetClose(item.id)}
                                >
                                  <CloseIcon fontSize="small" />
                                </IconButton>
                              )}
                            </HeaderActions>
                          </DragHandle>
                        </Tooltip>
                        <Collapse in={!collapsedWidgets[item.id]}>
                          <ContentWrapper $customStyle={item.contentStyle}>
                            {item.status === WidgetStatus.LOADING && (
                              <StatusContainer>
                                <CircularProgress size={24} />
                                {item.loadingMessage && (
                                  <Typography variant="body2" sx={{ ml: 1 }}>
                                    {item.loadingMessage}
                                  </Typography>
                                )}
                              </StatusContainer>
                            )}
                            {item.status === WidgetStatus.ERROR && (
                              <Alert severity="error" sx={{ mb: 2 }}>
                                {item.errorMessage || '오류가 발생했습니다.'}
                              </Alert>
                            )}
                            {item.content}
                          </ContentWrapper>
                        </Collapse>
                      </StyledCard>
                    </WidgetWrapper>
                  )}
                </Draggable>
              ))}
            </AnimatePresence>
            {provided.placeholder}
          </Container>
        )}
      </Droppable>
    </DragDropContext>
  );
};

export default DashboardLayout;
