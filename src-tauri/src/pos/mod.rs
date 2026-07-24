// ── POS Module ─────────────────────────────────────────────────────
// Split from monolithic pos.rs into logical submodules.

mod types;
mod checkout;
mod agent;
mod lifecycle;
mod dashboard;
mod setup;

// Re-export all public types and command functions
pub use types::*;
pub use checkout::checkout_pos_cash;
pub use agent::create_agent_transaction;
pub use lifecycle::{transaction_action, get_transaction};
pub use dashboard::{get_dashboard, get_pos_report};
pub use setup::setup_complete;
