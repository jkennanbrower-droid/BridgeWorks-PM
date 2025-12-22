"use client";

import type { CSSProperties, ReactNode } from "react";

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
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { ModuleLayout, WidgetSize } from "../types";
import { WidgetFrame } from "../widgets/WidgetFrame";
import { UrgentAttentionWidget } from "../widgets/UrgentAttentionWidget";
import { KpiTilesWidget } from "../widgets/KpiTilesWidget";
import { RentCollectionsWidget } from "../widgets/RentCollectionsWidget";
import { MaintenanceHealthWidget } from "../widgets/MaintenanceHealthWidget";
import { LeasingPipelineWidget } from "../widgets/LeasingPipelineWidget";

type OverviewModuleProps = {
  layout: ModuleLayout;
  customizeMode: boolean;
  onLayoutChange: (layout: ModuleLayout) => void;
};

type WidgetRegistryItem = {
  title: string;
  component: () => JSX.Element;
  allowedSizes: WidgetSize[];
};

const widgetRegistry: Record<string, WidgetRegistryItem> = {
  urgent_attention: {
    title: "Urgent Attention",
    component: UrgentAttentionWidget,
    allowedSizes: ["tall", "lg", "md"],
  },
  kpi_tiles: {
    title: "KPI Tiles",
    component: KpiTilesWidget,
    allowedSizes: ["sm", "md"],
  },
  rent_collections: {
    title: "Rent & Collections",
    component: RentCollectionsWidget,
    allowedSizes: ["sm", "md"],
  },
  maintenance_health: {
    title: "Maintenance Health",
    component: MaintenanceHealthWidget,
    allowedSizes: ["sm", "md"],
  },
  leasing_pipeline: {
    title: "Leasing Pipeline",
    component: LeasingPipelineWidget,
    allowedSizes: ["sm", "md"],
  },
};

type SortableWidgetProps = {
  widgetId: string;
  title: string;
  sizePreset: WidgetSize;
  allowedSizes: WidgetSize[];
  customizeMode: boolean;
  onResize: (nextSize: WidgetSize) => void;
  children: ReactNode;
  className?: string;
};

function SortableWidget({
  widgetId,
  title,
  sizePreset,
  allowedSizes,
  customizeMode,
  onResize,
  children,
  className,
}: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widgetId, disabled: !customizeMode });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${className ?? ""} ${isDragging ? "z-10" : ""}`}
    >
      <WidgetFrame
        title={title}
        sizePreset={sizePreset}
        allowedSizes={allowedSizes}
        customizeMode={customizeMode}
        onResize={onResize}
        dragHandleProps={customizeMode ? { ...attributes, ...listeners } : undefined}
      >
        {children}
      </WidgetFrame>
    </div>
  );
}

export function OverviewModule({
  layout,
  customizeMode,
  onLayoutChange,
}: OverviewModuleProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const widgetIds = layout.widgets.map((widget) => widget.id);
  const urgentWidget = layout.widgets.find(
    (widget) => widget.type === "urgent_attention",
  );
  const otherWidgets = layout.widgets.filter(
    (widget) => widget.type !== "urgent_attention",
  );

  const renderWidget = (widget: (typeof layout.widgets)[number]) => {
    const registry = widgetRegistry[widget.type];
    if (!registry) return null;
    const WidgetComponent = registry.component;
    return (
      <SortableWidget
        key={widget.id}
        widgetId={widget.id}
        title={registry.title}
        sizePreset={widget.sizePreset}
        allowedSizes={registry.allowedSizes}
        customizeMode={customizeMode}
        onResize={(nextSize) => {
          const nextWidgets = layout.widgets.map((item) =>
            item.id === widget.id
              ? { ...item, sizePreset: nextSize }
              : item,
          );
          onLayoutChange({ widgets: nextWidgets });
        }}
        className="h-full"
      >
        <WidgetComponent />
      </SortableWidget>
    );
  };

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Property Overview
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Snapshot of critical operations and leasing performance.
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(event) => {
          if (!customizeMode) return;
          const { active, over } = event;
          if (!over || active.id === over.id) return;
          const oldIndex = layout.widgets.findIndex(
            (widget) => widget.id === active.id,
          );
          const newIndex = layout.widgets.findIndex(
            (widget) => widget.id === over.id,
          );
          if (oldIndex === -1 || newIndex === -1) return;
          onLayoutChange({
            widgets: arrayMove(layout.widgets, oldIndex, newIndex),
          });
        }}
      >
        <SortableContext items={widgetIds} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
            {urgentWidget ? renderWidget(urgentWidget) : null}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:grid-rows-2 md:auto-rows-fr">
              {otherWidgets.map((widget) => renderWidget(widget))}
            </div>
          </div>
        </SortableContext>
      </DndContext>

      {customizeMode && layout.widgets.length ? (
        <p className="text-xs text-slate-400">
          Drag widgets to reorder, or use the menu to resize.
        </p>
      ) : null}
    </section>
  );
}
