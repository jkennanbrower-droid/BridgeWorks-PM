import { EmptyState } from "../components/EmptyState";

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="page">
      <div className="pageHeader">
        <div>
          <div className="pageTitle">{title}</div>
          <div className="pageSubtitle">Coming next.</div>
        </div>
      </div>
      <div className="panel">
        <EmptyState title="Not implemented yet" body="This page will be added next." />
      </div>
    </div>
  );
}

