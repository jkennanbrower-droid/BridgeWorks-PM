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

const SETTINGS_MODULE_ID = "settings";
const MESSAGES_MODULE_ID = "messages";
const UTILITY_MODULE_IDS = new Set([SETTINGS_MODULE_ID, MESSAGES_MODULE_ID]);

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

function ActionTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
        active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {label}
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

  const settingsModule = modules.find((module) => module.id === SETTINGS_MODULE_ID);
  const messagesModule = modules.find((module) => module.id === MESSAGES_MODULE_ID);
  const visibleModules = modules.filter((module) => !UTILITY_MODULE_IDS.has(module.id));
  const ids = visibleModules.map((module) => module.id);

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
        const nextVisible = arrayMove(ids, oldIndex, newIndex);
        const hiddenIds = modules
          .map((module) => module.id)
          .filter((id) => !nextVisible.includes(id));
        onModuleReorder([...nextVisible, ...hiddenIds]);
      }}
    >
      <SortableContext items={ids} strategy={horizontalListSortingStrategy}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-1 flex-wrap gap-2">
            {visibleModules.map((module) => (
            <Tab
              key={module.id}
              module={module}
              active={module.id === activeModuleId}
              customizeMode={customizeMode}
              onSelect={onModuleSelect}
            />
            ))}
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {messagesModule ? (
              <ActionTab
                label={messagesModule.label}
                active={activeModuleId === messagesModule.id}
                onClick={() => onModuleSelect(messagesModule.id)}
              />
            ) : null}
            {settingsModule ? (
              <ActionTab
                label={settingsModule.label}
                active={activeModuleId === settingsModule.id}
                onClick={() => onModuleSelect(settingsModule.id)}
              />
            ) : null}
          </div>
        </div>
      </SortableContext>
    </DndContext>
  );
}
