//go:build !linux

package dashboard

type SystemStats struct {
	CPUUsage float64 `json:"cpu_usage"`
	RAMTotal uint64  `json:"ram_total"`
	RAMUsed  uint64  `json:"ram_used"`
	RAMUsage float64 `json:"ram_usage"`
	TempC    float64 `json:"temp_c"`
}

type DiskStats struct {
	Total uint64  `json:"total"`
	Used  uint64  `json:"used"`
	Usage float64 `json:"usage"`
}

var lastStats SystemStats

func GetSystemStats() SystemStats {
	if lastStats.RAMTotal == 0 {
		lastStats = SystemStats{
			CPUUsage: 5.0,
			RAMTotal: 1024 * 1024 * 1024,
			RAMUsed:  256 * 1024 * 1024,
			RAMUsage: 25.0,
			TempC:    45.0,
		}
	}
	
	return lastStats
}

func GetDiskUsage(path string) (DiskStats, error) {
	return DiskStats{
		Total: 32 * 1024 * 1024 * 1024,
		Used:  8 * 1024 * 1024 * 1024,
		Usage: 25.0,
	}, nil
}
