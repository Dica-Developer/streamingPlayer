audica radio
============

A stream player/recorder with a Textstar Serial LCD, Web UI and REST UI. Developed to use a raspberrypi as a standalone streaming radio.
VLC is needed for playing. Streamripper is needed for recording. It allows to display the current songs of a radio stream if a playlist
url and a regular expression is configured for parsing it out.

### REST UI

<table>
<tr><td>POST</td><td>http:&#x002FA;/raspberripy:3141/add?url=&lt;url&gt;[&amp;name=&lt;name&gt;&amp;playlistUrl=&lt;stream playlist url&gt;&amp;playlistRegexp=&lt;regular expression with group(s)&gt;]</td><td>Add a radio station and a optional name for it. Optional is also the a parameter for the stream playlist and  a parameter with a regular expression that defines what do parse out from the content of the playlist url</td></tr>
<tr><td>POST</td><td>http:&#x002FA;/raspberripy:3141/update?old=&lt;stream entry as json&gt;&amp;&lt;new url value&gt;&amp;name=&lt;new name value&gt;&amp;playlistUrl=&lt;new stream playlist url value&gt;&amp;playlistRegexp=&lt;new regular expression with group(s) value&gt;</td><td>Update a radio station.</td></tr>
<tr><td>POST</td><td>http:&#x002FA;/raspberripy:3141/delete?old=&lt;stream entry as json&gt;</td><td>Deletes the first station that matches the stream properties</td></tr>
<tr><td>GET</td><td>http:&#x002FA;/raspberrypi:3141/next</td><td>Switch to the next radio station</td></tr>
<tr><td>GET</td><td>http:&#x002FA;/raspberrypi:3141/prev</td><td>Switch to the previous radio station</td></tr>
<tr><td>GET</td><td>http:&#x002FA;/raspberrypi:3141/play</td><td>Start playing the current radio station</td></tr>
<tr><td>GET</td><td>http:&#x002FA;/raspberrypi:3141/stop</td><td>Stop playing the current radio station</td></tr>
<tr><td>GET</td><td>http:&#x002FA;/raspberrypi:3141/record</td><td>Start recording the current radio station</td></tr>
<tr><td>GET</td><td>http:&#x002FA;/raspberrypi:3141/recordStop</td><td>Stop recording the current radio station</td></tr>
<tr><td>GET</td><td>http:&#x002FA;/raspberrypi:3141/stations</td><td>Gives a list of all added stations back. The format is as json.</td></tr>
<tr><td>GET</td><td>http:&#x002FA;/raspberrypi:3141/currentSong</td><td>Gives the current song of the current stream back.</td></tr>
</table>

### LCD UI

<table>
<tr><td>Key A (upper left)</td><td>Switch to the previous radio station</td></tr>
<tr><td>Key C (upper right)</td><td>Switch to the next radio station</td></tr>
<tr><td>Key B short &lt;2s (bottom left)</td><td>Start/Stop playing the current radio station</td></tr>
<tr><td>Key B long &gt;2s (bottom left)</td><td>Show ip's of eth0 and/or wlan0 if available</td></tr>
<tr><td>Key D (bottom right)</td><td>Start/Stop recording the current radio station</td></tr>
</table>

### Web UI

Open the following url http://raspberrypi:3141/ in a web browser.

### Examples

Complete values for the "kexp" radio station:
<table>
<tr><td>url</td><td>http:/&#x002FA;kexp-mp3-2.cac.washington.edu:8000/listen.pls</td></tr>
<tr><td>name</td><td>kexp</td></tr>
<tr><td>playlistUrl</td><td>http://kexp.org/playlist/miniplaylist</td></tr>
<tr><td>playlistRegexp</td><td>&lt;title&gt;([^]*)&lt;/title&gt;</td></tr>
</table>

Complete values for the "radio eins" radio station:
<table>
<tr><td>url</td><td>http:/&#x002FA;www.radioeins.de/live.m3u</td></tr>
<tr><td>name</td><td>radio eins</td></tr>
<tr><td>playlistUrl</td><td>http:/&#x002FA;www.radioeins.de/themen/musik/playlists.html</td></tr>
<tr><td>playlistRegexp</td><td>&lt;p class="artist"&gt;(.*?)&lt;/p&gt;[^]*&lt;p class="songtitle"&gt;(.*?)&lt;/p&gt;</td></tr>
</table>

There can be multiple groups. Every group is displayed.
