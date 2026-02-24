package cron

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

func TestSaveStore_FilePermissions(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("file permission bits are not enforced on Windows")
	}

	tmpDir := t.TempDir()
	storePath := filepath.Join(tmpDir, "cron", "jobs.json")

	cs := NewCronService(storePath, nil)

	_, err := cs.AddJob("test", CronSchedule{Kind: "every", EveryMS: int64Ptr(60000)}, "hello", false, "cli", "direct")
	if err != nil {
		t.Fatalf("AddJob failed: %v", err)
	}

	info, err := os.Stat(storePath)
	if err != nil {
		t.Fatalf("Stat failed: %v", err)
	}

	perm := info.Mode().Perm()
	if perm != 0o600 {
		t.Errorf("cron store has permission %04o, want 0600", perm)
	}
}

func TestLoadStore_EdgeCases(t *testing.T) {
	tmpDir := t.TempDir()
	storePath := filepath.Join(tmpDir, "jobs.json")

	// Case 1: File doesn't exist
	cs := NewCronService(storePath, nil)
	if len(cs.store.Jobs) != 0 {
		t.Errorf("expected empty store for non-existent file, got %d jobs", len(cs.store.Jobs))
	}

	// Case 2: Empty file
	if err := os.WriteFile(storePath, []byte(""), 0o600); err != nil {
		t.Fatalf("failed to write empty file: %v", err)
	}
	if err := cs.Load(); err != nil {
		t.Errorf("Load failed for empty file: %v", err)
	}
	if len(cs.store.Jobs) != 0 {
		t.Errorf("expected empty store for empty file, got %d jobs", len(cs.store.Jobs))
	}

	// Case 3: Corrupted JSON
	if err := os.WriteFile(storePath, []byte("{invalid json"), 0o600); err != nil {
		t.Fatalf("failed to write corrupted file: %v", err)
	}
	if err := cs.Load(); err != nil {
		t.Errorf("Load failed for corrupted file: %v", err)
	}
	if len(cs.store.Jobs) != 0 {
		t.Errorf("expected empty store for corrupted file, got %d jobs", len(cs.store.Jobs))
	}
}

func int64Ptr(v int64) *int64 {
	return &v
}
