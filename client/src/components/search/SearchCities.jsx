import { Autocomplete, Button, TextField } from "@mui/material";
import React, { useEffect, useState } from "react";
import SearchIcon from '@mui/icons-material/Search';
import { fetchCities } from "../../services/serverCalls";

function SearchCities({handleLocation}) {

    const [options, setOptions] = useState([]);
    const [isMounted, setIsMounted] = useState(false);
    const [city, setCity] = useState('');

    const getCities = async() => {
        const cities = await fetchCities(city);
        setOptions(cities);
    };

    const handleCityChange = (event, value) => {
      const location = value.replaceAll(' ','').split(',');
      handleLocation({city:location[0],state:location[1], country:location[2]});
    };

    useEffect(() => {
        if (isMounted) {
          getCities()
        } else {
          setIsMounted(true);
        }
      }, [isMounted, city]);

  return (
    <Autocomplete
      style={{ display:"inline"}}
      options={options}
      getOptionLabel={(option) => option}
      onChange={handleCityChange}
      renderInput={(params) => (
        <TextField
        onChange={(event)=>setCity(event.target.value)}
          variant="standard"
          style={{
            width: "400px",
            border: "1px solid #D8D4D3",
            borderRadius: "20px",
            textAlign: "left",
            padding: "10px",
          }}
          {...params}
          placeholder="Search..."
          InputProps={{
            disableUnderline: true,
            ...params.InputProps,
            startAdornment: (
              <>
                <SearchIcon />
                {params.InputProps.startAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}

export default SearchCities;
