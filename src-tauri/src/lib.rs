pub mod accounts;
pub mod agent_services;
pub mod auth;
pub mod common;
pub mod debts;
pub mod pos;
pub mod printer;
pub mod products;
pub mod seed;
pub mod session;
pub mod settings;
pub mod transactions;
pub mod whatsapp;

use crate::accounts::{
    adjust_account_balance, bank_fee, create_account, deactivate_account, get_mutation_summary,
    list_account_mutations, list_accounts, owner_draw, transfer_accounts, update_account,
};
use crate::agent_services::{
    create_agent_service, create_fee_tier, list_agent_services, list_fee_tiers,
};
use crate::auth::{
    create_admin, create_user, db_init, deactivate_user, get_me, health_check, list_users, login,
    logout, setup_status, update_user, LoginRateLimiter,
};
use crate::debts::{add_debt_payment, build_debt_reminder, create_debt, list_debts};
use crate::pos::{
    checkout_pos_cash, create_agent_transaction, get_dashboard, get_pos_report, get_transaction,
    setup_complete, transaction_action,
};
use crate::printer::print_thermal_receipt;
use crate::products::{
    create_category, create_product, deactivate_category, deactivate_product, get_product_image,
    list_categories, list_products, restock_product, update_category, update_product,
};
use crate::session::SessionState;
use crate::seed::{clear_demo, seed_demo, seed_system, setup_templates};
use crate::settings::{get_settings, update_settings};
use crate::transactions::{
    create_database_backup, list_app_logs, list_database_backups, list_transaction_items,
    list_transactions, restore_database_backup,
};
use crate::whatsapp::{
    whatsapp_logout, whatsapp_notify, whatsapp_restart, whatsapp_start, whatsapp_status,
    WaSidecarState,
};
use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = app.get_webview_window("main").map(|window| {
                let _ = window.set_focus();
            });
        }))
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .setup(|app| {
            let db = crate::common::init_db(app.handle())?;
            app.manage(db);
            // Set up WhatsApp sidecar lifecycle (kill on close, heartbeat)
            crate::whatsapp::setup_whatsapp_lifecycle(app.handle());
            Ok(())
        })
        .manage(SessionState(std::sync::Mutex::new(None)))
        .manage(WaSidecarState::new())
        .manage(LoginRateLimiter::new())
        .invoke_handler(tauri::generate_handler![
            // Health & Setup
            health_check,
            db_init,
            setup_status,
            create_admin,
            setup_complete,
            // Auth & Users
            login,
            logout,
            get_me,
            list_users,
            create_user,
            update_user,
            deactivate_user,
            // Accounts
            list_accounts,
            create_account,
            update_account,
            deactivate_account,
            adjust_account_balance,
            transfer_accounts,
            owner_draw,
            bank_fee,
            list_account_mutations,
            get_mutation_summary,
            // Products & Categories
            list_categories,
            create_category,
            update_category,
            deactivate_category,
            list_products,
            create_product,
            update_product,
            deactivate_product,
            get_product_image,
            restock_product,
            // Transactions
            list_transactions,
            list_transaction_items,
            get_transaction,
            transaction_action,
            checkout_pos_cash,
            create_agent_transaction,
            // Dashboard & Reports
            get_dashboard,
            get_pos_report,
            // Debts
            list_debts,
            create_debt,
            add_debt_payment,
            build_debt_reminder,
            // Agent Services & Fees
            list_agent_services,
            create_agent_service,
            list_fee_tiers,
            create_fee_tier,
            // Settings
            get_settings,
            update_settings,
            // Backup & Logs
            create_database_backup,
            list_database_backups,
            restore_database_backup,
            list_app_logs,
            // Seed & Demo
            seed_system,
            setup_templates,
            seed_demo,
            clear_demo,
            // Printer
            print_thermal_receipt,
            // WhatsApp
            whatsapp_status,
            whatsapp_start,
            whatsapp_restart,
            whatsapp_logout,
            whatsapp_notify,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
