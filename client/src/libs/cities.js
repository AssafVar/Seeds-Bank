export const converToCitiesList = (citiesObj) => {
    const citiesArray =  citiesObj.map(city=>{
        return city.matching_full_name
    });
    return citiesArray;
};