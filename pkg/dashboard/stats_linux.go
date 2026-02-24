//go:build linux

package dashboard

import (
	"os"
	"strconv"
	"strings"
	"syscall"
	"time"
)

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

var (
	lastCPUUsage  float64
	lastIdleTime  uint64
	lastTotalTime uint64
	lastCheck     time.Time
)

func GetSystemStats() SystemStats {
	stats := SystemStats{}

	// 1. Get RAM
	if meminfo, err := os.ReadFile("/proc/meminfo"); err == nil {
		lines := strings.Split(string(meminfo), "\n")
		var memTotal, memFree, memAvailable, buffers, cached uint64
		for _, line := range lines {
			parts := strings.Fields(line)
			if len(parts) >= 2 {
				val, _ := strconv.ParseUint(parts[1], 10, 64)
				switch parts[0] {
				case "MemTotal:":
					memTotal = val * 1024
				case "MemFree:":
					memFree = val * 1024
				case "MemAvailable:":
					memAvailable = val * 1024
				case "Buffers:":
					buffers = val * 1024
				case "Cached:":
					cached = val * 1024
				}
			}
		}
		
		stats.RAMTotal = memTotal
		if memAvailable > 0 {
			stats.RAMUsed = memTotal - memAvailable
		} else {
			stats.RAMUsed = memTotal - memFree - buffers - cached
		}
		if memTotal > 0 {
			stats.RAMUsage = float64(stats.RAMUsed) / float64(memTotal) * 100.0
		}
	}

	// 2. Get CPU Usage
	if statContent, err := os.ReadFile("/proc/stat"); err == nil {
		lines := strings.Split(string(statContent), "\n")
		if len(lines) > 0 {
			parts := strings.Fields(lines[0]) // "cpu  user nice system idle iowait irq softirq steal guest guest_nice"
			if len(parts) > 7 && parts[0] == "cpu" {
				var idle, total uint64
				
				idleStr := parts[4] // idle
				idleRaw, _ := strconv.ParseUint(idleStr, 10, 64)
				iowaitStr := parts[5] // iowait
				iowaitRaw, _ := strconv.ParseUint(iowaitStr, 10, 64)
				
				idle = idleRaw + iowaitRaw
				
				for i := 1; i < len(parts); i++ {
					val, _ := strconv.ParseUint(parts[i], 10, 64)
					total += val
				}
				
				if lastTotalTime > 0 {
					totalDelta := float64(total - lastTotalTime)
					idleDelta := float64(idle - lastIdleTime)
					if totalDelta > 0 {
						stats.CPUUsage = 100.0 * (1.0 - idleDelta/totalDelta)
						lastCPUUsage = stats.CPUUsage
					} else {
						stats.CPUUsage = lastCPUUsage
					}
				} else {
					stats.CPUUsage = 0.0
				}
				
				lastIdleTime = idle
				lastTotalTime = total
				lastCheck = time.Now()
			}
		}
	} else {
		stats.CPUUsage = lastCPUUsage
	}

	// 3. Get Temperature
	if tempContent, err := os.ReadFile("/sys/class/thermal/thermal_zone0/temp"); err == nil {
		tempStr := strings.TrimSpace(string(tempContent))
		tempRaw, _ := strconv.ParseFloat(tempStr, 64)
		stats.TempC = tempRaw / 1000.0
	}

	return stats
}

func GetDiskUsage(path string) (DiskStats, error) {
	var stat syscall.Statfs_t
	if err := syscall.Statfs(path, &stat); err != nil {
		return DiskStats{}, err
	}

	total := stat.Blocks * uint64(stat.Bsize)
	free := stat.Bfree * uint64(stat.Bsize)
	used := total - free
	usage := 0.0
	if total > 0 {
		usage = float64(used) / float64(total) * 100.0
	}

	return DiskStats{
		Total: total,
		Used:  used,
		Usage: usage,
	}, nil
}
