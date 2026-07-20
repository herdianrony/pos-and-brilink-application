import { createDatabaseBackup, restoreDatabaseBackup, type BackupRow } from "../api";

export function useBackupRestore({
  saving,
  setSaving,
  onRefresh,
  onMessage,
}: {
  saving: boolean;
  setSaving: (value: boolean) => void;
  onRefresh: () => Promise<unknown>;
  onMessage: (message: string) => void;
}) {
  async function handleCreateBackup() {
    if (saving) return;
    setSaving(true);
    try {
      const backup = await createDatabaseBackup();
      await onRefresh();
      onMessage(`Backup berhasil dibuat: ${backup.name}`);
    } catch (error) {
      onMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleRestoreBackup(backup: BackupRow) {
    if (!confirm(`Pulihkan database dari ${backup.name}? Data saat ini akan dibackup otomatis sebelum pulihkan.`)) return;
    if (saving) return;
    setSaving(true);
    try {
      await restoreDatabaseBackup({ path: backup.path });
      await onRefresh();
      onMessage("Pulihkan database berhasil. Jika ada data yang belum berubah, tutup dan buka ulang aplikasi.");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  return { handleCreateBackup, handleRestoreBackup };
}
