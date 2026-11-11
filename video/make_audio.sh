#!/usr/bin/env bash
# Erzeugt den Ambient-Ton (12,43 s) und legt ihn unter das Video.
set -e
cd "$(dirname "$0")/out"
D=12.433
B='sin(2*PI*196*t)*exp(-1.6*t)+0.6*sin(2*PI*392*t)*exp(-2.4*t)+0.35*sin(2*PI*523*t)*exp(-3*t)+0.25*sin(2*PI*98*t)*exp(-0.9*t)'
S='0.5*sin(2*PI*1568*T)+0.4*sin(2*PI*2093*T)+0.3*sin(2*PI*2637*T)'
ffmpeg -v error -y \
 -f lavfi -i "aevalsrc='0.55*(${B})':s=44100:d=$D" \
 -f lavfi -i "aevalsrc='0.10*(sin(2*PI*55*t)+0.7*sin(2*PI*82.4*t)+0.4*sin(2*PI*110*t))*(0.75+0.25*sin(2*PI*0.25*t))*min(1,t/0.8)':s=44100:d=$D" \
 -f lavfi -i "anoisesrc=color=brown:amplitude=0.25:d=$D:r=44100" \
 -f lavfi -i "aevalsrc='if(gt(t,4.2),0.12*min(1,(t-4.2)/0.6)*exp(-0.9*(t-4.2))*(${S//T/t}),0)+if(gt(t,11.56),0.12*min(1,(t-11.56)/0.3)*exp(-1.2*(t-11.56))*(${S//T/t}),0)':s=44100:d=$D" \
 -filter_complex "[2]lowpass=f=500,highpass=f=60,volume=0.6[w];[3]aecho=0.8:0.6:120|240:0.4|0.25[s];[0][1][w][s]amix=inputs=4:normalize=0,afade=t=out:st=12.0:d=0.43,loudnorm=I=-16:TP=-1.5,aformat=channel_layouts=stereo[a]" \
 -map "[a]" -c:a pcm_s16le ambient.wav
ffmpeg -v error -y -i video_stumm.mp4 -i ambient.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart video_final.mp4
