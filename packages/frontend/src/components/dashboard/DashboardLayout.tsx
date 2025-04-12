import React, { useState } from 'react';

import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import styled from 'styled-components';

interface Widget {
  id: string;
  content: React.ReactNode;
}

interface DashboardLayoutProps {
  widgets: Widget[];
  onLayoutChange?: (newOrder: Widget[]) => void;
}

// DropResult 인터페이스 직접 정의
interface DropResult {
  draggableId: string;
  type: string;
  source: {
    index: number;
    droppableId: string;
  };
  destination?: {
    index: number;
    droppableId: string;
  };
  reason: 'DROP' | 'CANCEL';
}

const Container = styled.div`
  display: flex;
  flex-wrap: wrap;
`;

const WidgetWrapper = styled.div`
  margin: 8px;
`;

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ widgets, onLayoutChange }) => {
  const [items, setItems] = useState<Widget[]>(widgets);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);
    setItems(newItems);
    if (onLayoutChange) {
      onLayoutChange(newItems);
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="dashboard" direction="horizontal">
        {(provided: any) => (
          <Container ref={provided.innerRef} {...provided.droppableProps}>
            {items.map((item, index) => (
              <Draggable key={item.id} draggableId={item.id} index={index}>
                {(providedDrag: any) => (
                  <WidgetWrapper
                    ref={providedDrag.innerRef}
                    {...providedDrag.draggableProps}
                    {...providedDrag.dragHandleProps}
                  >
                    {item.content}
                  </WidgetWrapper>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </Container>
        )}
      </Droppable>
    </DragDropContext>
  );
};

export default DashboardLayout;
