pub mod accounts;
pub mod agent_services;
pub mod auth;
pub mod common;
pub mod debts;
pub mod printer;
pub mod products;
pub mod session;
pub mod settings;
pub mod transactions;
pub mod whatsapp;

use crate::accounts::{
    adjust_account_balance, bank_fee, create_account, list_account_mutations, list_accounts,
    owner_draw, transfer_accounts,
};
use crate::agent_services::{
    create_agent_service, create_fee_tier, list_agent_services, list_fee_tiers,
};
use crate::auth::{
    create_admin, create_user, db_init, health_check, list_users, login, logout, setup_status,
};
use crate::debts::{add_debt_payment, build_debt_reminder, create_debt, list_debts};
use crate::printer::print_thermal_receipt;
use crate::products::{
    create_category, create_product, deactivate_product, get_product_image, list_categories,
    list_products, update_product,
};
use crate::session::SessionState;
use crate::settings::{get_settings, update_settings};
use crate::transactions::{
    create_database_backup, list_app_logs, list_database_backups, list_transaction_items,
    list_transactions, restore_database_backup,
};
use crate::whatsapp::{whatsapp_logout, whatsapp_restart, whatsapp_start, whatsapp_status};
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
        .manage(SessionState(std::sync::Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            health_check,
            db_init,
            setup_status,
            create_admin,
            list_users,
            create_user,
            login,
            logout,
            list_accounts,
            create_account,
            adjust_account_balance,
            transfer_accounts,
            owner_draw,
            bank_fee,
            list_account_mutations,
            list_categories,
            create_category,
            list_products,
            create_product,
            update_product,
            deactivate_product,
            get_product_image,
            list_transactions,
            list_transaction_items,
            list_app_logs,
            create_database_backup,
            list_database_backups,
            restore_database_backup,
            list_debts,
            create_debt,
            add_debt_payment,
            build_debt_reminder,
            list_agent_services,
            create_agent_service,
            list_fee_tiers,
            create_fee_tier,
            print_thermal_receipt,
            get_settings,
            update_settings,
            whatsapp_status,
            whatsapp_start,
            whatsapp_restart,
            whatsapp_logout,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
