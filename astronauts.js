const express = require("express");
const router = require('express').Router();
const bodyParser = require("body-parser");
const ds = require("./datastore");

const datastore = ds.datastore

const ASTRONAUTS = 'Astronauts'
const ROCKETS = 'Rockets'

router.use(bodyParser.json())


// Rocket helper functions
function get_rocket(id) {
    const key = datastore.key([ROCKETS, parseInt(id, 10)])
    return datastore.get(key)
}

function update_rocket(id, name, price, weight, astronauts, ownerID) {
    const key = datastore.key([ROCKETS, parseInt(id, 10)])
    const rocket = { name: name, price: price, weight: weight, astronauts: astronauts, ownerID: ownerID }
    return datastore.update({ key: key, data: rocket }).then(() => {
        var selfUrl = `${baseUrl}/rockets/${key.id}`
        const new_data = { name: name, price: price, weight: weight, astronauts: astronauts, ownerID: ownerID, self: selfUrl}
        datastore.update({ key: key, data: new_data }).then(() => {
        })
        return key
    }) 
}


// Functions for Astronauts
function get_astronaut(id) {
    const key = datastore.key([ASTRONAUTS, parseInt(id, 10)])
    return datastore.get(key)
}

function post_astronaut(name, age, sex) {
    var key = datastore.key(ASTRONAUTS)
    
    const new_astronaut = { name: name, age: age, sex: sex }
    return datastore.save({ key: key, data: new_astronaut }).then(() => {
        var selfUrl = `${baseUrl}/astronauts/${key.id}`
        const new_data = { name: name, age: age, sex: sex, self: selfUrl}
        datastore.save({ key: key, data: new_data }).then(() => {
        })
        return key
    })
}

function get_astronauts(req) {
    var query_total = datastore.createQuery(ASTRONAUTS)
    var q = datastore.createQuery(ASTRONAUTS).limit(5)
    var results = {}
    var prev
    var total = 0

    return datastore.runQuery(query_total).then((entities) => {
        astronauts = entities[0].map(ds.fromDatastore)
        total = astronauts.length
        
    }).then(() => {
        console.log(total)
        results.total = total
        if (Object.keys(req.query).includes('cursor')) {
            prev = req.protocol + '://' + req.get('host') + req.baseUrl  + '?cursor=' + req.query.cursor
            q = q.start(req.query.cursor)
        }
        return datastore.runQuery(q).then((entities) => {
            results.items = entities[0].map(ds.fromDatastore)
            if (typeof prev != 'undefined') {
                results.previous = prev
            }
            if(entities[1].moreResults != ds.Datastore.NO_MORE_RESULTS) {
                results.next = req.protocol + '://' + req.get('host') + req.baseUrl + '?cursor=' + entities[1].endCursor
            }
            return results
        })
    })
}

function patch_astronaut(id, name, age, sex, rocketName) {
    const key = datastore.key([ASTRONAUTS, parseInt(id, 10)])
    const astronaut = { name: name, age: age, sex: sex, rocketName: rocketName  }
    return datastore.update({ key: key, data: astronaut }).then(() => {
        var selfUrl = `${baseUrl}/astronauts/${key.id}`
        const new_data = { name: name, age: age, sex: sex, rocketName: rocketName, self: selfUrl }
        datastore.update({ key: key, data: new_data }).then(() => {
        })
        return key
    })
}


function put_astronaut(id, name, age, sex, rocketName) {
    const key = datastore.key([ASTRONAUTS, parseInt(id, 10)])
    const astronaut = { name: name, age: age, sex: sex, rocketName: rocketName }
    return datastore.save({ key: key, data: astronaut }).then(() => {
        var selfUrl = `${baseUrl}/astronauts/${key.id}`
        const new_data = { name: name, age: age, sex: sex, rocketName: rocketName, self: selfUrl }
        datastore.save({ key: key, data: new_data }).then(() => {
        })
        return key
    })

}

function delete_astronaut(id) {
    const key = datastore.key([ASTRONAUTS, parseInt(id, 10)])
    return datastore.delete(key)
}



// Routes
// Get list of astronauts
router.get('/', function(req, res) {
    get_astronauts(req).then((astronauts) => {
        res.status(200).json(astronauts)
    })
})

router.post('/', function(req, res) {
    var selfUrl = `${baseUrl}/astronauts`
    console.log(req.body)
    if (req.body.name == null || req.body.age == null || req.body.sex == null) {
        res.status(400).json({ Error: 'The request object is missing at least one of the required attributes.' })
    }
    if (req.get('content-type') != 'application/json') {
        res.status(415).send('Can only accept application/json data type')
    } else {
        post_astronaut(req.body.name, req.body.age, req.body.sex)
        .then( key => {
            res.status(201).json({ id : key.id, name : req.body.name, age: req.body.age, sex: req.body.sex, rocket: undefined, self: `${selfUrl}/${key.id}`})
        });
    }
});

router.patch('/:id', function(req, res) {
    var id = req.params.id
    var selfUrl = `${baseUrl}/astronauts/${id}`
    if (req.get('content-type') != 'application/json') {
        res.status(415).send('Can only accept application/json data type')
    }
    get_astronaut(id).then((astronaut) => {
        console.log(astronaut)
        if (astronaut[0] == null) {
            res.status(404).send('A astronaut with this astronaut id does not exist.')
        } else {
            if (req.body.name == null) {
                req.body.name = astronaut[0].name
            } 
            if (req.body.age == null) {
                req.body.age = astronaut[0].age
            }
            if (req.body.sex == null) {
                req.body.sex = astronaut[0].sex
            }
           var rocketName = astronaut[0].rocketName
           if (rocketName == null) {
               rocketName = undefined
           }
            patch_astronaut(id, req.body.name, req.body.age, req.body.sex, req.body.rocketName).then((key) => {
                res.status(200).json({ id: key.id, name: req.body.name, age: req.body.age, sex: req.body.sex, rocket: rocketName, self: selfUrl })
            })
        }

    })
})


// Put astronaut on rocket
router.patch('/:id/rockets/:rocket_id', function(req, res) {
    if (req.get('content-type') != 'application/json') {
        res.status(415).send('Can only accept application/json data type')
    }
    var id = req.params.id
    var rocket_id = req.params.rocket_id
    var selfUrl = `${baseUrl}/astronauts/${id}`
    get_rocket(rocket_id).then((rocket) => {
        var rocket_name = rocket[0].name
        var rocket_price = rocket[0].price
        var rocket_weight = rocket[0].weight
        var astronauts = rocket[0].astronauts
        var ownerID = rocket[0].ownerID
        if (rocket[0] == null) {
            res.status(404).send('A rocket with this rocket id does not exist.')
        }
        console.log(rocket)
        get_astronaut(id).then((astronaut) => {
            if (astronaut[0] == null) {
                res.status(404).send('A astronaut with this astronaut id does not exist.')
            }
            console.log(astronaut)
            astronauts.push(id)
            console.log(astronaut)
            var name = astronaut[0].name
            var age = astronaut[0].age
            var sex = astronaut[0].sex
            if (astronaut[0].rocketName != null) {
                var rocket_id_2 = astronaut[0].rocketName
                get_rocket(rocket_id_2).then((rocket2) => {
                    var rocket_name_2 = rocket2[0].name
                    var rocket_price_2 = rocket2[0].price
                    var rocket_weight_2 = rocket2[0].weight
                    var astronauts2 = rocket2[0].astronauts
                    var ownerID2 = rocket2[0].ownerID
                    var index = astronauts2.indexOf(id)
                    astronauts2.splice(index, 1)
                    update_rocket(rocket_id_2, rocket_name_2, rocket_price_2, rocket_weight_2, astronauts2, ownerID2)
                })
            }
            patch_astronaut(id, name, age, sex, rocket_id).then((key) => {
                update_rocket(rocket_id, rocket_name, rocket_price, rocket_weight, astronauts, ownerID).then((key2) => {
                    res.status(200).json({ id: key.id, name: name, age: age, sex: sex, rocket: parseInt(rocket_id, 10), self: selfUrl})
                })
                
            })

        })
    })
})

router.put('/:id', function(req, res) {
    var id = req.params.id
    var selfUrl = `${baseUrl}/astronauts/${id}`
    if (req.get('content-type') != 'application/json') {
        res.status(415).send('Can only accept application/json data type')
    }
    get_astronaut(id).then((astronaut) => {
       var rocketName = astronaut[0].rocketName
       if (rocketName == null) {
           rocketName = undefined
       }
        if (astronaut[0] == null) {
            res.status(404).send('An astronaut with this id does not exist.')
        } else {
            put_astronaut(id, req.body.name, req.body.price, req.body.weight, rocketName).then((key) => {
                console.log(key)
                res.status(200).json({ id: key.id, name: req.body.name, price: req.body.price, weight: req.body.weight, rocket: rocketName, self: selfUrl })
            })
        }
    })
})

router.delete('/:id', function(req, res) {
    var id = req.params.id
    console.log(id)
    get_astronaut(id).then((astronaut) => {
        if (astronaut[0] == null) {
            res.status(404).json({ Error: 'No astronaut with this id exists'})
        } else {
            var rocket_id = astronaut[0].rocketName
            if (rocket_id != null) {
                get_rocket(rocket_id).then((rocket) => {
                    var rocket_name = rocket[0].name
                    var rocket_price = rocket[0].price
                    var rocket_weight = rocket[0].weight
                    var astronauts = rocket[0].astronauts
                    var ownerID = rocket[0].ownerID
                    var index = rocket[0].astronauts.indexOf(id)
                    console.log(index)
                    astronauts.splice(index, 1)
                    update_rocket(rocket_id, rocket_name, rocket_price, rocket_weight, astronauts, ownerID).then((key2) => {
                        delete_astronaut(id).then(res.status(204).end())
                    })
                })
            }
            delete_astronaut(id).then(res.status(204).end())
        }
    })
})

// Delete rocket from astronaut
router.delete('/:id/rockets', function (req, res) {
    var id = req.params.id
    console.log(id)
    var selfUrl = `${baseUrl}/astronauts/${id}`
    if (req.get('content-type') != 'application/json') {
        res.status(415).send('Can only accept application/json data type')
    }
    get_astronaut(id).then((astronaut) => {
        if (astronaut[0] == null) {
            res.status(404).send('An astronaut with this id does not exist.')
        }
        var name = astronaut[0].name
        var age = astronaut[0].age
        var sex = astronaut[0].sex
        var rocket_id = astronaut[0].rocketName
        astronaut[0].rocketName = null
        if (rocket_id != null) {
            get_rocket(rocket_id).then((rocket) => {
                var rocket_name = rocket[0].name
                var rocket_price = rocket[0].price
                var rocket_weight = rocket[0].weight
                var astronauts = rocket[0].astronauts
                var ownerID = rocket[0].ownerID
                var index = rocket[0].astronauts.indexOf(id)

                astronauts.splice(index, 1)
                update_rocket(rocket_id, rocket_name, rocket_price, rocket_weight, astronauts, ownerID).then((key2) => {

                        patch_astronaut(id, name, age, sex, null).then((key) => {
                            res.status(200).json({ id: id, name: astronaut[0].name, price: astronaut[0].price, weight: astronaut[0].weight, rocket: undefined, self: selfUrl})
                        })
                })
            })
        }
    })
})

const PORT = process.env.PORT || 8080
var baseUrl;

if (PORT == 8080) {
    baseUrl = `http://localhost:8080`
} else {
    baseUrl = `https://final-project-hollingx`
}

module.exports = router;