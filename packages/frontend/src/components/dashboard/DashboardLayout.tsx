import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import styled from 'styled-components';
import {
  Card,
  Typography,
  IconButton,
  Tooltip,
  Zoom,
  Menu,
  MenuItem,
  Collapse,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  DragIndicator as DragIndicatorIcon,
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
  Fullscreen as FullscreenIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import ClientOnly from '../utils/ClientOnly';

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
  emptyMessage?: React.ReactNode;
  loadingComponent?: React.ReactNode;
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

const EmptyMessageWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding: 2rem;
  text-align: center;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 200px;
`;

const LoadingSpinner = () => <CircularProgress />;

const WidgetHeaderActions = ({
  item,
  menuAnchor,
  collapsedWidgets,
  handleWidgetRefresh,
  handleWidgetFullscreen,
  handleMenuOpen,
  handleMenuClose,
  handleWidgetCollapse,
  handleWidgetClose
}: {
  item: Widget;
  menuAnchor: Record<string, HTMLElement | null>;
  collapsedWidgets: Record<string, boolean>;
  handleWidgetRefresh: (widgetId: string) => void;
  handleWidgetFullscreen: (widgetId: string) => void;
  handleMenuOpen: (event: React.MouseEvent<HTMLButtonElement>, widgetId: string) => void;
  handleMenuClose: (widgetId: string) => void;
  handleWidgetCollapse: (widgetId: string) => void;
  handleWidgetClose: (widgetId: string) => void;
}) => (
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
    {(item.actions?.length > 0 || item.isCollapsible) && (
      <>
        <IconButton
          size="small"
          onClick={(e) => handleMenuOpen(e, item.id)}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
        <Menu
          anchorEl={menuAnchor[item.id]}
          open={menuAnchor[item.id] != null}
          onClose={() => handleMenuClose(item.id)}
        >
          {item.isCollapsible && (
            <MenuItem onClick={() => handleWidgetCollapse(item.id)}>
              {collapsedWidgets[item.id] ? '펼치기' : '접기'}
            </MenuItem>
          )}
          {item.actions?.map((action, actionIndex) => (
            <MenuItem
              key={`action-${item.id}-${actionIndex}`}
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
);

const renderWidgetContent = (item: Widget) => {
  if (item.status === WidgetStatus.LOADING) {
    return (
      <StatusContainer>
        <CircularProgress size={24} />
        {item.loadingMessage && (
          <Typography variant="body2" sx={{ ml: 1 }}>
            {item.loadingMessage}
          </Typography>
        )}
      </StatusContainer>
    );
  } else if (item.status === WidgetStatus.ERROR) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {item.errorMessage || '오류가 발생했습니다.'}
      </Alert>
    );
  } else {
    return <div>{item.content}</div>;
  }
};

const WidgetContent = ({
  item,
  collapsedWidgets
}: {
  item: Widget;
  collapsedWidgets: Record<string, boolean>;
}) => (
  <Collapse in={!collapsedWidgets[item.id]}>
    <ContentWrapper $customStyle={item.contentStyle}>
      {renderWidgetContent(item)}
    </ContentWrapper>
  </Collapse>
);

const renderStaticWidgets = () => {
  return <div>Loading...</div>;
};

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  widgets,
  onLayoutChange,
  isLoading = false,
  className,
  animationEnabled = true,
  onWidgetClose,
  onWidgetRefresh,
  defaultCollapsed = false,
  emptyMessage,
  loadingComponent
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

  useEffect(() => {
    setItems(widgets);
  }, [widgets]);

  useEffect(() => {
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
    if (!result.destination) {
      return;
    }
    
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
    handleMenuClose(widgetId);
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

  const renderDraggableWidget = (item: Widget, providedDrag: any) => {
    const tooltipTitle = item.description ?? '';
    const hasTooltip = !!item.description;
    
    return (
      <WidgetWrapper
        {...providedDrag.draggableProps}
        ref={providedDrag.innerRef}
        $width={item.width}
        variants={itemVariants}
        layout
      >
        {hasTooltip ? (
          <Tooltip
            title={tooltipTitle}
            TransitionComponent={Zoom}
            arrow
            placement="top"
          >
            <StyledCard $customStyle={item.style}>
              <DragHandle
                {...providedDrag.dragHandleProps}
                $customStyle={item.headerStyle}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <DragIndicatorIcon fontSize="small" style={{ marginRight: '0.5rem' }} />
                  <Typography variant="subtitle2">{item.title}</Typography>
                </div>
                <WidgetHeaderActions
                  item={item}
                  menuAnchor={menuAnchor}
                  collapsedWidgets={collapsedWidgets}
                  handleWidgetRefresh={handleWidgetRefresh}
                  handleWidgetFullscreen={handleWidgetFullscreen}
                  handleMenuOpen={handleMenuOpen}
                  handleMenuClose={handleMenuClose}
                  handleWidgetCollapse={handleWidgetCollapse}
                  handleWidgetClose={handleWidgetClose}
                />
              </DragHandle>
              <WidgetContent
                item={item}
                collapsedWidgets={collapsedWidgets}
              />
            </StyledCard>
          </Tooltip>
        ) : (
          <StyledCard $customStyle={item.style}>
            <DragHandle
              {...providedDrag.dragHandleProps}
              $customStyle={item.headerStyle}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <DragIndicatorIcon fontSize="small" style={{ marginRight: '0.5rem' }} />
                <Typography variant="subtitle2">{item.title}</Typography>
              </div>
              <WidgetHeaderActions
                item={item}
                menuAnchor={menuAnchor}
                collapsedWidgets={collapsedWidgets}
                handleWidgetRefresh={handleWidgetRefresh}
                handleWidgetFullscreen={handleWidgetFullscreen}
                handleMenuOpen={handleMenuOpen}
                handleMenuClose={handleMenuClose}
                handleWidgetCollapse={handleWidgetCollapse}
                handleWidgetClose={handleWidgetClose}
              />
            </DragHandle>
            <WidgetContent
              item={item}
              collapsedWidgets={collapsedWidgets}
            />
          </StyledCard>
        )}
      </WidgetWrapper>
    );
  };

  if (!items || items.length === 0) {
    return emptyMessage ? <EmptyMessageWrapper>{emptyMessage}</EmptyMessageWrapper> : null;
  } else if (isLoading) {
    return <LoadingContainer>{loadingComponent ?? <LoadingSpinner />}</LoadingContainer>;
  }

  return (
    <ClientOnly fallback={renderStaticWidgets()}>
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
                    {(providedDrag) => renderDraggableWidget(item, providedDrag)}
                  </Draggable>
                ))}
              </AnimatePresence>
              {provided.placeholder}
            </Container>
          )}
        </Droppable>
      </DragDropContext>
    </ClientOnly>
  );
};

export default DashboardLayout;
