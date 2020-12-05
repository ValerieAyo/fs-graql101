const { ApolloServer, UserInputError, gql } = require('apollo-server')
const { v4: uuidv4 } = require('uuid')
const Person = require('../models/person')
const User = require('../models/user')
const jwt = require('jsonwebtoken') // to be installed

const MONGODB_URI = "mongodb+srv://admin:test123@cluster0.83slw.mongodb.net/<dbname>?retryWrites=true&w=majority"

const JWT_SECRET= 'ALL HAIL JESUS'

console.log('connection to', MONGODB_URI)

const options = {
  useNewUrlParser: true, 
  useUnifiedTopology: true, 
  useFindAndModify: false, 
  useCreateIndex: true
}

mongoose.connect(MONGODB_URI, options)
  .then(() => {
    console.log('connected to M_DB')
  })
  .catch((error) => {
    console.log('error connecting to DB', error.message)
  })
  

let persons = [
  {
    name: "Arto Hellas",
    phone: "040-123543",
    street: "Tapiolankatu 5 A",
    city: "Espoo",
    id: "3d594650-3436-11e9-bc57-8b80ba54c431"
  },
  {
    name: "Matti Luukkainen",
    phone: "040-432342",
    street: "Malminkaari 10 A",
    city: "Helsinki",
    id: '3d599470-3436-11e9-bc57-8b80ba54c431'
  },
  {
    name: "Venla Ruuska",
    street: "Nallemäentie 22 C",
    city: "Helsinki",
    id: '3d599471-3436-11e9-bc57-8b80ba54c431'
  }
]

const typeDefs = gql`

  type User {
    username: String!,
    friends: [Person!]!,
    id: ID!
  }

  type Token {
    value: String!
  }

  
  enum YesNo {
    YES
    NO
  }

  type Address {
    city: String!,
    street: String!
  }
  
  type Person {
    name: String!,
    phone: String,
    address: Address! 
    id: ID!
  }

  type Query {
    personCount: Int!,
    allPersons(phone: YesNo): [Person!]!,
    findPerson(name: String!): Person,
    me: User
  }

  type Mutation {
    addPerson(
      name: String!,
      phone: String,
      street: String!,
      city: String!
    ) : Person
    editNumber(
      name: String!,
      phone: String!
    ) : Person
    createUser(
      username: String!
    ) : User
    login(
      username: String!,
      password: String!
    ) : Token
  }

`

const resolvers = {
  Query: {
    personCount: () => Person.collection.countDocuments,
    // allPersons: (root, args) => persons,
    allPersons: (root, args) => {
      if(!args.phone) {
        return Person.find({})
      }

      return Person.find({ phone: { $exists: args.phone === "YES" }})
    },
    findPerson: (root, args) => Person.findOne({ name: args.name })
  },
  Mutation: {
    createUser: (root, args) => {
      const user = new User({ username: args.username })

      return user.save()
        .catch(error => {
          throw new UserInputError(error.message, {
            invalidArgs: args
          })
        })
    },
    login: async (root, args) => {
      const user = await User.findOne({ username: args.username })

      if (!user || args.password !== 'secred') {
        throw new UserInputError("wrong credentials")
      }

      const userForToken = {
        username: args.username,
        id: user._id
      }

      return { value: jwt.sign(userForToken, JWT_SECRET)}
    },
    addPerson: async (root, args) => {
      const person = new Person({...args})

      try {
        await person.save()
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args
        })
      }
      return person
    },
    editNumber: async (root, args) => {
      const person = await Person.findOne({ name: args.name })
      person.phone = args.phone
      
      try {
        await person.save()
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args
        })
      }
      return person
    }
  },
  Person: {
    address: (root) => {
      return {
        street: root.street,
        city: root.city
      }
    },
    // id: (root) => root.id
  }
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => {
    const auth = req ? req.headers.authorization : null 
    if (auth && auth.toLowerCase().startsWith('bearer ')) {
      const decodedToken = jwt.verify(auth.substring(7), JWT_SECRET)
      const currentUser = await User.findById(decodedToken.id).populate('friends')
      return { currentUser }
    }
  }
})

server.listen()
  .then(({ url }) => {
    console.log(`Server ready @ ${url}`)
  })
