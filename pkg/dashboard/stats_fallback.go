//go:build !linux

package dashboard

import (
	"runtime"
)

type SystemStats struct {
	CPUUsage  float64 `json:"cpu_usage"`
	RAMTotal  uint64  `json:"ram_total"`
	RAMUsed   uint64  `json:"ram_used"`
	RAMUsage  float64 `json:"ram_usage"`
	TempC     float64 `json:"temp_c"`
}

var lastStats SystemStats

func GetSystemStats() SystemStats {
	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)

	// Fallback implementation, won't represent real system load perfectly
	// but prevents crashes on Mac/Windows dev environments
	usage := float64(memStats.Alloc) / float64(memStats.Sys) * 100.0
	if memStats.Sys == 0 {
		usage = 0
	}
	
	lastStats = SystemStats{
		CPUUsage:  0.0, // Hard to get reliably without cgo/extra packages on darwin/windows
		RAMTotal:  memStats.Sys,
		RAMUsed:   memStats.Alloc,
		RAMUsage:  usage,
		TempC:     0.0, // Not available natively without specifics
	}
	
	return lastStats
}
