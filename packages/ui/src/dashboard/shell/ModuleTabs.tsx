"use client";

import type { CSSProperties } from "react";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ModuleDef } from "../types";

type ModuleTabsProps = {
  modules: ModuleDef[];
  activeModuleId: string;
  customizeMode: boolean;
  onModuleSelect: (moduleId: string) => void;
  onModuleReorder: (moduleOrder: string[]) => void;
};

type TabProps = {
  module: ModuleDef;
  active: boolean;
  customizeMode: boolean;
  onSelect: (moduleId: string) => void;
};

function Tab({ module, active, customizeMode, onSelect }: TabProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id, disabled: !customizeMode });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => onSelect(module.id)}
      style={style}
      className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-slate-900 text-white"
          : "text-slate-600 hover:bg-slate-100"
      } ${customizeMode ? "cursor-grab" : "cursor-pointer"} ${
        isDragging ? "opacity-70" : ""
      }`}
      {...attributes}
      {...listeners}
    >
      {module.label}
    </button>
  );
}

export function ModuleTabs({
  modules,
  activeModuleId,
  customizeMode,
  onModuleSelect,
  onModuleReorder,
}: ModuleTabsProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const ids = modules.map((module) => module.id);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={(event) => {
        if (!customizeMode) return;
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIndex = ids.indexOf(String(active.id));
        const newIndex = ids.indexOf(String(over.id));
        if (oldIndex === -1 || newIndex === -1) return;
        onModuleReorder(arrayMove(ids, oldIndex, newIndex));
      }}
    >
      <SortableContext items={ids} strategy={horizontalListSortingStrategy}>
        <div className="flex flex-wrap gap-2">
          {modules.map((module) => (
            <Tab
              key={module.id}
              module={module}
              active={module.id === activeModuleId}
              customizeMode={customizeMode}
              onSelect={onModuleSelect}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
