import inquirer from 'inquirer';
import {Tmdb} from 'tmdb';
  

const tmdb = new Tmdb("0e1d77830bb9605c0cedb519b12805cf");

function getContentData(name)
{
    name = name.replaceAll(/^(\(.*?\))+/g, "");
    name = name.replaceAll(/^(\[.*?\])+/g, "");
    name = name.replaceAll(/[\_\.\-]/g, " ");
    name = name.trim();

    let seasonPattern = /\b(?:s(\d{1,2})(?:e(\d{1,3}))?|(\d{1,2})x(\d{1,3}))\b/i;
    let seasonMatch = name.match(seasonPattern);
    let season;
    let episode;

    if (seasonMatch)
    {
        season = seasonMatch[1];
        episode = seasonMatch[2];
    }

    let yearPattern = /\b(?:19\d{2})|(?:20[0-5]\d)\b/i;
    let yearMatch = name.match(yearPattern);
    let year;
    if (yearMatch)
    {
        year = yearMatch[0];
    }

    let titlePattern = /^[\p{L} ]+[\p{L}]{2,}(?: ?[1-9]\b)?/u;
    let titleMatch = name.match(titlePattern);
    let title;
    if (titleMatch)
    {
        title = titleMatch[0];
    }

    return {title: title, year: year, season: season, episode: episode};
}


async function getContentByName(name)
{
    let data = getContentData(name);
    
    try
    {
        let result;
        let matches = []
        if (data.season)
        {
            result = await tmdb.get("search/tv", {query:data.title, first_air_date_year:data.year || null} );
            matches = result.results.map(r => (
                {title: r.originalName, year: r.firstAirDate ? r.firstAirDate.split("-")[0] : data.year, season: data.season, episode: data.episode}));
        }
        else
        {
            result = await tmdb.get("search/movie", {query:data.title, year:data.year || null} );
            matches = result.results.map(r => (
                {title: r.originalTitle, year: r.releaseDate ? r.releaseDate.split("-")[0] : data.year}));
        }
        
        matches = matches.filter((v, i, a) => a.findIndex(e => e.title.toLowerCase() == v.title.toLowerCase() && e.year == v.year) === i);

        let exactMatches = matches.filter(r => r.title.toLowerCase().split(":")[0] == data.title.toLowerCase().split(":")[0] && (!data.year || r.year == data.year));
        if (exactMatches.length > 0)
             matches = exactMatches;

        return matches;  
    }
    catch (e)
    {
        console.log(e);
    }

}

function generatePath(content, movieRoot, tvShowRoot)
{
    let safeTitle = content.title.replaceAll(/[:?<>"/|*\\]/g, " - ").replaceAll(/ +/g, " ");
    return content.season ? `${tvShowRoot}/${safeTitle}${content.year && ` (${content.year})`}/Season ${content.season}` :
        `${movieRoot}/${safeTitle}${content.year && ` (${content.year})`}`;
}

async function chooseContent(originalFile, contents)
{
    return await inquirer
    .prompt([
        {
            type: 'list',
            name: "content",
            message: 'Select matching content for ' + originalFile,
            choices: contents.map(c => ({name:`${c.title}${c.year && ` (${c.year})`}`, value:c})).concat([new inquirer.Separator(), "Custom"]),
        },
        {
            type: 'input',
            name: 'custom',
            message: 'Provide folder name for ' + originalFile + ":",
            when: (answers => answers.content === "Custom")
        }
    ])
    .then(answers => 
        answers.custom ? {title:answers.custom} : answers.content
    );
}

export default async function getPathForFile(file, movieRoot, tvShowRoot)
{
    let contents = await getContentByName(file);
    let path;
    let content;
    
    if (contents.length == 1)
    {
        content = contents[0];
        path = generatePath(contents[0], movieRoot, tvShowRoot)
    }
    else
    {
        content = await chooseContent(file, contents);
        path = generatePath(choice, movieRoot, tvShowRoot);
    }
    content.path = path;
    return content;
}



//setTimeout(() => {}, 100000);

