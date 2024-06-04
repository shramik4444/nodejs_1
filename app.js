const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')

const databasePath = path.join(__dirname, 'covid19India.db')

const app = express()

app.use(express.json())

let database = null

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () =>
      console.log('Server Running at http://localhost:3000/'),
    )
  } catch (error) {
    console.log(`DB Error: ${error.message}`)
    process.exit(1)
  }
}

initializeDbAndServer()

const convertMovieDbObjectToResponseObject = dbObject => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  }
}

const convertDirectorDbObjectToResponseObject = dbObject => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  }
}

app.get('/states/', async (request, response) => {
  const getStates = `
    SELECT
      *
    FROM
      STATE;`
  const stateslist = await database.all(getStates)
  response.send(
    stateslist.map(each => convertMovieDbObjectToResponseObject(each)),
  )
})

app.get('/states/:stateId', async (request, response) => {
  const {stateId} = request.params
  const getStates = `
    SELECT
      *
    FROM
      STATE 
    WHERE
      state_id = ${stateId}  ;`
  const stateslist = await database.get(getStates)
  response.send(convertMovieDbObjectToResponseObject(stateslist))
})

app.post('/districts/', async (request, response) => {
  const districtDetails = request.body
  console.log(districtDetails)
  const {districtName, stateId, cases, cured, active, deaths} = districtDetails
  const postquery = `
  INSERT 
  INTO
  district (  district_name,
  state_id,
  cases,
  cured,
  active,
  deaths) VALUES (

'${districtName}',
  '${stateId}',
  '${cases}',
  '${cured}',
  '${active}',
  '${deaths}'
);`
  await database.run(postquery)
  response.send('District Successfully Added')
})

app.get('/districts/:districtId', async (request, response) => {
  const {districtId} = request.params
  const getDistrict = `
    SELECT
      *
    FROM
      district 
    WHERE
      district_id = ${districtId}  ;`
  const districtList = await database.get(getDistrict)
  response.send(convertDirectorDbObjectToResponseObject(districtList))
})

app.delete('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const deleteQuery = `
    DELETE FROM
      district
    WHERE
      district_id = ${districtId};`
  await database.run(deleteQuery)
  response.send('District Removed')
})

app.put('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const districtDetails = request.body
  const {districtName, stateId, cases, cured, active, deaths} = districtDetails
  const updateQuery = `
    UPDATE
      district
    SET
      district_name='${districtName}',
      state_id=${stateId},
      cases=${cases},
      cured=${cured},
      active=${active},
      deaths='${deaths}'
    WHERE
      district_id = ${districtId};`
  await database.run(updateQuery)
  response.send('District Details Updated')
})

app.get('/states/:stateId/stats/', async (request, response) => {
  const {stateId} = request.params
  const getStatesquery = `
    SELECT
      SUM(cases),
      SUM(cured),
      SUM(active),
      SUM(deaths)
    FROM
      district 
    WHERE
      state_id = ${stateId};`
  const stats = await database.get(getStatesquery)
  console.log(stats)
  response.send({
    totalCases: stats['SUM(cases)'],
    totalCured: stats['SUM(cured)'],
    totalActive: stats['SUM(active)'],
    totalDeaths: stats['SUM(deaths)'],
  })
})

app.get('/districts/:districtId/details/', async (request, response) => {
  const {districtId} = request.params
  const getDistrictIdQuery = `
    select state_id from district
    where district_id = ${districtId};
    ` //With this we will get the state_id using district table
  const getDistrictIdQueryResponse = await database.get(getDistrictIdQuery)
  const getStateNameQuery = `
    select state_name as stateName from state
    where state_id = ${getDistrictIdQueryResponse.state_id};
    ` //With this we will get state_name as stateName using the state_id
  const getStateNameQueryResponse = await database.get(getStateNameQuery)
  response.send(getStateNameQueryResponse)
}) //sending the required response

module.exports = app
