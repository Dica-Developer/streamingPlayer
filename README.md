audica radio
============

A stream player/recorder with a Textstar Serial LCD, Web UI and REST UI. Developed to use a raspberrypi as a standalone streaming radio.
VLC is needed for playing. Streamripper is needed for recording.

### REST UI

<table>
<tr><td>POST</td><td>http://raspberripy:3141/add?url=<url>[&amp;name=&lt;name&gt;]</td><td>Add a radio station and a optional name for it</td></tr>
<tr><td>GET</td><td>http://raspberrypi:3141/next</td><td>Switch to the next radio station</td></tr>
<tr><td>GET</td><td>http://raspberrypi:3141/prev</td><td>Switch to the previous radio station</td></tr>
<tr><td>GET</td><td>http://raspberrypi:3141/play</td><td>Start playing the current radio station</td></tr>
<tr><td>GET</td><td>http://raspberrypi:3141/stop</td><td>Stop playing the current radio station</td></tr>
<tr><td>GET</td><td>http://raspberrypi:3141/record</td><td>Start recording the current radio station</td></tr>
<tr><td>GET</td><td>http://raspberrypi:3141/recordStop</td><td>Stop recording the current radio station</td></tr>
</table>

### LCD UI

<table>
<tr><td>Key A (upper left)</td><td>Switch to the previous radio station</td></tr>
<tr><td>Key C (upper right)</td><td>Switch to the next radio station</td></tr>
<tr><td>Key B short &lt;2s (bottom left)</td><td>Start/Stop playing the current radio station</td></tr>
<tr><td>Key B long &gt;2s (bottom left)</td><td>Show ip's of eth0 and/or wlan0 if available</td></tr>
<tr><td>Key D (bottom right)</td><td>Start/Stop recording the current radio station</td></tr>
</table>
