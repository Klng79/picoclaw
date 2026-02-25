import psutil
import socket
import logging
from luma.core.interface.serial import i2c
from luma.core.render import canvas
from luma.oled.device import ssd1306
from time import sleep

logging.basicConfig(filename='/tmp/sys_stats.log', level=logging.INFO, format='%(asctime)s %(message)s')

def get_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

def draw_htop_bar(draw, x, y, width, height, percent):
    # Draw Brackets - shift y slightly for character alignment
    draw.text((x, y-2), "[", fill="white")
    bar_start_x = x + 8
    bar_end_x = x + width - 8
    draw.text((bar_end_x, y-2), "]", fill="white")
    
    # Draw segments
    # Each segment: 2px wide line + 1px gap = 3px per segment
    available_width = bar_end_x - bar_start_x - 2
    num_segments = int(available_width / 3)
    active_segments = int(num_segments * (percent / 100))
    
    for i in range(num_segments):
        sx = bar_start_x + (i * 3)
        if i < active_segments:
            # Use small rectangles instead of lines for thicker segments
            draw.rectangle((sx, y + 1, sx + 1, y + height - 1), fill="white", outline="white")

# Initialize
try:
    serial = i2c(port=1, address=0x3C)
    device = ssd1306(serial)
    logging.info(\"OLED Initialized successfully at 0x3C\")
except Exception as e:
    logging.error(f\"Failed to initialize I2C: {e}\")
    exit(1)

while True:
    try:
        cpus = psutil.cpu_percent(interval=None, percpu=True)
        mem = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        ip = get_ip()

        with canvas(device) as draw:
            # Header
            draw.text((0, 0), f\"Pi: {ip}\", fill=\"white\")
            
            y_offset = 12
            # CPU Cores (up to 4)
            for i, cpu in enumerate(cpus[:4]):
                draw.text((0, y_offset), f\"{i}\", fill=\"white\")
                # Bar from x=10 to x=85 (75px width)
                draw_htop_bar(draw, 10, y_offset, 75, 8, cpu)
                draw.text((88, y_offset), f\"{int(cpu)}%\", fill=\"white\")
                y_offset += 9
                
            # Memory Row
            draw.text((0, y_offset), \"M\", fill=\"white\")
            draw_htop_bar(draw, 10, y_offset, 75, 8, mem.percent)
            draw.text((88, y_offset), f\"{int(mem.percent)}%\", fill=\"white\")
            
            # Bottom Info
            y_offset += 10
            draw.text((0, y_offset), f\"D:{disk.percent}%\", fill=\"white\")
            draw.text((55, y_offset), f\"RAM:{mem.used//1024//1024}M\", fill=\"white\")
            
    except Exception as e:
        logging.error(f\"Runtime error: {e}\")
    
    sleep(0.5)
