cc=cl.exe
link=link.exe

all: doufen.exe

.c.obj:
  $(cc) $(cdebug) $(cflags) $(cvars) $*.c

doufen.exe: doufen.obj
  $(link) $(ldebug) $(conflags) -out:doufen.exe doufen.obj $(conlibs)

