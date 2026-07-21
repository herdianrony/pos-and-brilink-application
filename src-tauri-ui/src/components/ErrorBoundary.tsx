import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "./ui";

export class ErrorBoundary extends Component<
  { children: ReactNode; onReset?: () => void },
  { hasError: boolean; message: string }
> {
  state = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message || "Terjadi kesalahan tampilan." };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("CatatAgen UI error", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="grid min-h-[360px] place-items-center rounded-3xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
        <div className="grid max-w-md gap-3">
          <strong className="text-xl font-black text-red-800">Halaman mengalami kendala</strong>
          <p className="m-0 text-sm font-semibold">{this.state.message}</p>
          <div className="mt-2 flex justify-center gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                this.setState({ hasError: false, message: "" });
                this.props.onReset?.();
              }}
            >
              Muat Ulang Halaman
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
