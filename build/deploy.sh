# This is just an outline, not an actual working script

version = grep package.json
# set to actual server UNC (requires network access and privileges)
dir = '/Volumes/lib/npmap.js/$version'
rm-rf $dir
mkdir $dir
cp dist $dir
# akamai purge
# or use the online tool from within the nps network
# the following is just a guess, verify
user = grep user from secrets.json
password = grep password from secrets.json
curl https://www.nps.gov/lib/npmap.js/$version/*?user=$user&password=$password
