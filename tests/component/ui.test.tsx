// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Component Tests ───────────────────────────────
// Test komponen UI dengan React Testing Library

import { Button, Card, Badge, Input, Spinner, EmptyState, Tabs, Modal, ConfirmDialog, AlertDialog } from "@/components/ui";
import { DynamicIcon } from "@/components/DynamicIcon";
import { BankIcon, isBankIcon } from "@/components/BankIcon";

// ── Button ───────────────────────────────────────
describe("Button", () => {
  it("should render with text", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("should call onClick when clicked", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    await userEvent.click(screen.getByText("Click"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("should not call onClick when disabled", async () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Disabled</Button>);
    await userEvent.click(screen.getByText("Disabled"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("should apply variant classes", () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByText("Primary").className).toContain("gradient-primary");

    rerender(<Button variant="danger">Danger</Button>);
    expect(screen.getByText("Danger").className).toContain("bg-red-500");
  });
});

// ── Card ─────────────────────────────────────────
describe("Card", () => {
  it("should render children", () => {
    render(<Card><div>Card content</div></Card>);
    expect(screen.getByText("Card content")).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    render(<Card className="custom-class"><div>Content</div></Card>);
    const card = screen.getByText("Content").parentElement;
    expect(card?.className).toContain("custom-class");
  });
});

// ── Badge ────────────────────────────────────────
describe("Badge", () => {
  it("should render text", () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("should apply variant classes", () => {
    const { rerender } = render(<Badge variant="success">OK</Badge>);
    expect(screen.getByText("OK").className).toContain("emerald");

    rerender(<Badge variant="danger">Error</Badge>);
    expect(screen.getByText("Error").className).toContain("red");
  });
});

// ── Input ────────────────────────────────────────
describe("Input", () => {
  it("should render label", () => {
    render(<Input label="Username" />);
    expect(screen.getByText("Username")).toBeInTheDocument();
  });

  it("should render input field", () => {
    render(<Input label="Test" placeholder="Enter text" />);
    expect(screen.getByPlaceholderText("Enter text")).toBeInTheDocument();
  });

  it("should call onChange", async () => {
    const onChange = vi.fn();
    render(<Input label="Test" onChange={onChange} placeholder="Type" />);
    await userEvent.type(screen.getByPlaceholderText("Type"), "a");
    expect(onChange).toHaveBeenCalled();
  });
});

// ── Spinner ──────────────────────────────────────
describe("Spinner", () => {
  it("should render", () => {
    const { container } = render(<Spinner />);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });
});

// ── EmptyState ───────────────────────────────────
describe("EmptyState", () => {
  it("should render title", () => {
    render(<EmptyState icon="package" title="No data" />);
    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  it("should render subtitle", () => {
    render(<EmptyState icon="package" title="Empty" subtitle="Add items" />);
    expect(screen.getByText("Add items")).toBeInTheDocument();
  });
});

// ── Tabs ─────────────────────────────────────────
describe("Tabs", () => {
  it("should render all tab labels", () => {
    render(
      <Tabs
        tabs={[
          { id: "tab1", label: "Tab 1" },
          { id: "tab2", label: "Tab 2" },
        ]}
        active="tab1"
        onChange={() => {}}
      />
    );
    expect(screen.getByText("Tab 1")).toBeInTheDocument();
    expect(screen.getByText("Tab 2")).toBeInTheDocument();
  });

  it("should call onChange when tab clicked", async () => {
    const onChange = vi.fn();
    render(
      <Tabs
        tabs={[{ id: "t1", label: "First" }, { id: "t2", label: "Second" }]}
        active="t1"
        onChange={onChange}
      />
    );
    await userEvent.click(screen.getByText("Second"));
    expect(onChange).toHaveBeenCalledWith("t2");
  });
});

// ── Modal ────────────────────────────────────────
describe("Modal", () => {
  it("should not render when closed", () => {
    render(<Modal open={false} onClose={() => {}}><div>Hidden</div></Modal>);
    expect(screen.queryByText("Hidden")).not.toBeInTheDocument();
  });

  it("should render when open", () => {
    render(<Modal open={true} onClose={() => {}}><div>Visible</div></Modal>);
    expect(screen.getByText("Visible")).toBeInTheDocument();
  });

  it("should call onClose when backdrop clicked", async () => {
    const onClose = vi.fn();
    render(<Modal open={true} onClose={onClose}><div>Content</div></Modal>);
    // Click the backdrop (parent div)
    const backdrop = screen.getByText("Content").parentElement?.parentElement;
    if (backdrop) {
      await userEvent.click(backdrop);
      expect(onClose).toHaveBeenCalled();
    }
  });
});

// ── ConfirmDialog ────────────────────────────────
describe("ConfirmDialog", () => {
  it("should render title and message when open", () => {
    render(
      <ConfirmDialog
        open={true}
        onClose={() => {}}
        onConfirm={() => {}}
        title="Delete?"
        message="Are you sure?"
      />
    );
    expect(screen.getByText("Delete?")).toBeInTheDocument();
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
  });

  it("should call onConfirm when confirm clicked", async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open={true}
        onClose={() => {}}
        onConfirm={onConfirm}
        title="Confirm"
        message="Proceed?"
        confirmText="Yes"
      />
    );
    await userEvent.click(screen.getByText("Yes"));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("should call onClose when cancel clicked", async () => {
    const onClose = vi.fn();
    render(
      <ConfirmDialog
        open={true}
        onClose={onClose}
        onConfirm={() => {}}
        title="Confirm"
        message="Proceed?"
        cancelText="No"
      />
    );
    await userEvent.click(screen.getByText("No"));
    expect(onClose).toHaveBeenCalled();
  });
});

// ── AlertDialog ──────────────────────────────────
describe("AlertDialog", () => {
  it("should render message when open", () => {
    render(
      <AlertDialog
        open={true}
        onClose={() => {}}
        title="Info"
        message="This is an alert"
      />
    );
    expect(screen.getByText("Info")).toBeInTheDocument();
    expect(screen.getByText("This is an alert")).toBeInTheDocument();
  });

  it("should call onClose when OK clicked", async () => {
    const onClose = vi.fn();
    render(
      <AlertDialog
        open={true}
        onClose={onClose}
        message="Alert"
        confirmText="OK"
      />
    );
    await userEvent.click(screen.getByText("OK"));
    expect(onClose).toHaveBeenCalled();
  });
});

// ── DynamicIcon ──────────────────────────────────
describe("DynamicIcon", () => {
  it("should render known icon", () => {
    const { container } = render(<DynamicIcon name="package" size={20} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("should render fallback for unknown icon", () => {
    const { container } = render(<DynamicIcon name="nonexistent" fallback="package" size={20} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("should render fallback for null name", () => {
    const { container } = render(<DynamicIcon name={null} fallback="package" size={20} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});

// ── BankIcon ─────────────────────────────────────
describe("BankIcon", () => {
  it("should identify bank icons correctly", () => {
    expect(isBankIcon("bca")).toBe(true);
    expect(isBankIcon("bri")).toBe(true);
    expect(isBankIcon("mandiri")).toBe(true);
    expect(isBankIcon("pln")).toBe(true);
    expect(isBankIcon("bpjs")).toBe(true);
  });

  it("should not identify non-bank icons", () => {
    expect(isBankIcon("package")).toBe(false);
    expect(isBankIcon("utensils")).toBe(false);
    expect(isBankIcon(null)).toBe(false);
    expect(isBankIcon(undefined)).toBe(false);
    expect(isBankIcon("nonexistent")).toBe(false);
  });

  it("should render img for bank icon", () => {
    const { container } = render(<BankIcon name="bca" size={24} />);
    const img = container.querySelector("img");
    expect(img).toBeInTheDocument();
    expect(img?.getAttribute("src")).toBe("/icons/banks/bca.svg");
    expect(img?.getAttribute("alt")).toBe("bca");
  });

  it("should return null for non-bank icon", () => {
    const { container } = render(<BankIcon name="package" size={24} />);
    expect(container.querySelector("img")).not.toBeInTheDocument();
  });
});
