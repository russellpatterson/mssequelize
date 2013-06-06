var config         = require("../config/config")
  , Sequelize      = require("../../index")
  , sequelize      = new Sequelize(config.mssql.database, config.mssql.username, config.mssql.password, { pool: config.mssql.pool, logging: false, host: config.mssql.host, port: config.mssql.port })
  , Helpers        = new (require("../config/helpers"))(sequelize)
  , QueryGenerator = require("../../lib/dialects/mssql/query-generator")
  , util           = require("util")

describe('QueryGenerator', function() {
  beforeEach(function() { Helpers.sync() })
  afterEach(function() { Helpers.drop() })

  var suites = {

    attributesToSQL: [
      {
        arguments: [{id: 'INTEGER'}],
        expectation: {id: 'INTEGER'}
      },
      {
        arguments: [{id: 'INTEGER', foo: 'VARCHAR(255)'}],
        expectation: {id: 'INTEGER', foo: 'VARCHAR(255)'}
      },
      {
        arguments: [{id: {type: 'INTEGER'}}],
        expectation: {id: 'INTEGER'}
      },
      {
        arguments: [{id: {type: 'INTEGER', allowNull: false}}],
        expectation: {id: 'INTEGER NOT NULL'}
      },
      {
        arguments: [{id: {type: 'INTEGER', allowNull: true}}],
        expectation: {id: 'INTEGER'}
      },
      {
        arguments: [{id: {type: 'INTEGER', primaryKey: true, autoIncrement: true}}],
        expectation: {id: 'INTEGER IDENTITY PRIMARY KEY'}
      },
      {
        arguments: [{id: {type: 'INTEGER', defaultValue: 0}}],
        expectation: {id: 'INTEGER DEFAULT 0'}
      },
      {
        arguments: [{id: {type: 'INTEGER', unique: true}}],
        expectation: {id: 'INTEGER UNIQUE'}
      },
      {
        arguments: [{id: {type: 'INTEGER', references: 'Bar'}}],
        expectation: {id: 'INTEGER REFERENCES \"Bar\" (\"id\")'}
      },
      {
        arguments: [{id: {type: 'INTEGER', references: 'Bar', referencesKey: 'pk'}}],
        expectation: {id: 'INTEGER REFERENCES \"Bar\" (\"pk\")'}
      },
      {
        arguments: [{id: {type: 'INTEGER', references: 'Bar', onDelete: 'CASCADE'}}],
        expectation: {id: 'INTEGER REFERENCES \"Bar\" (\"id\") ON DELETE CASCADE'}
      },
      {
        arguments: [{id: {type: 'INTEGER', references: 'Bar', onUpdate: 'CASCADE'}}],
        expectation: {id: 'INTEGER REFERENCES \"Bar\" (\"id\") ON UPDATE CASCADE'}
      },
      {
        arguments: [{id: {type: 'INTEGER', allowNull: false, autoIncrement: true, defaultValue: 1, references: 'Bar', onDelete: 'CASCADE', onUpdate: 'CASCADE'}}],
        expectation: {id: 'INTEGER NOT NULL IDENTITY DEFAULT 1 REFERENCES \"Bar\" (\"id\") ON DELETE CASCADE ON UPDATE CASCADE'}
      },
    ],

    createTableQuery: [
      {
        arguments: ['myTable', {title: 'VARCHAR(255)', name: 'VARCHAR(255)'}],
        expectation: "IF OBJECT_ID('myTable', N'U') IS NULL CREATE TABLE \"myTable\" (\"title\" VARCHAR(255), \"name\" VARCHAR(255));"
      },
      {
        arguments: ['myTable', {title: 'VARCHAR(255)', name: 'VARCHAR(255)'}, {engine: 'MyISAM'}],
        expectation: "IF OBJECT_ID('myTable', N'U') IS NULL CREATE TABLE \"myTable\" (\"title\" VARCHAR(255), \"name\" VARCHAR(255));"
      },
      {
        arguments: ['myTable', {title: 'VARCHAR(255)', name: 'VARCHAR(255)'}, {charset: 'latin1'}],
        expectation: "IF OBJECT_ID('myTable', N'U') IS NULL CREATE TABLE \"myTable\" (\"title\" VARCHAR(255), \"name\" VARCHAR(255));"
      },
      {
        arguments: ['myTable', {title: 'VARCHAR(255)', name: 'VARCHAR(255)', id: 'INTEGER PRIMARY KEY'}],
        expectation: "IF OBJECT_ID('myTable', N'U') IS NULL CREATE TABLE \"myTable\" (\"title\" VARCHAR(255), \"name\" VARCHAR(255), \"id\" INTEGER PRIMARY KEY);"
      },
      {
        arguments: ['myTable', {title: 'VARCHAR(255)', name: 'VARCHAR(255)', otherId: 'INTEGER REFERENCES "otherTable" ("id") ON DELETE CASCADE ON UPDATE NO ACTION'}],
        expectation: "IF OBJECT_ID('myTable', N'U') IS NULL CREATE TABLE \"myTable\" (\"title\" VARCHAR(255), \"name\" VARCHAR(255), \"otherId\" INTEGER REFERENCES \"otherTable\" (\"id\") ON DELETE CASCADE ON UPDATE NO ACTION);"
      }
    ],

    dropTableQuery: [
      {
        arguments: ['myTable'],
        expectation: "IF  OBJECT_ID('myTable') < 1 DROP TABLE \"myTable\";"
      }
    ],

    selectQuery: [
      {
        arguments: ['myTable'],
        expectation: "SELECT * FROM \"myTable\";",
        context: QueryGenerator
      }, {
        arguments: ['myTable', {attributes: ['id', 'name']}],
        expectation: "SELECT \"id\", \"name\" FROM \"myTable\";",
        context: QueryGenerator
      }, {
        arguments: ['myTable', {where: {id: 2}}],
        expectation: "SELECT * FROM \"myTable\" WHERE \"myTable\".\"id\"=2;",
        context: QueryGenerator
      }, {
        arguments: ['myTable', {where: {name: 'foo'}}],
        expectation: "SELECT * FROM \"myTable\" WHERE \"myTable\".\"name\"='foo';",
        context: QueryGenerator
      }, {
        arguments: ['myTable', {where: {name: "foo';DROP TABLE myTable;"}}],
        expectation: "SELECT * FROM \"myTable\" WHERE \"myTable\".\"name\"='foo\\';DROP TABLE myTable;';",
        context: QueryGenerator
      }, {
        arguments: ['myTable', {where: 2}],
        expectation: "SELECT * FROM \"myTable\" WHERE \"myTable\".\"id\"=2;",
        context: QueryGenerator
      }, {
        arguments: ['foo', { attributes: [['count(*)', 'count']] }],
        expectation: 'SELECT count(*) as \"count\" FROM \"foo\";',
        context: QueryGenerator
      }, {
        arguments: ['myTable', {where: "foo='bar'"}],
        expectation: "SELECT * FROM \"myTable\" WHERE foo='bar';",
        context: QueryGenerator
      }, {
        arguments: ['myTable', {order: "id DESC"}],
        expectation: "SELECT * FROM \"myTable\" ORDER BY \"id\" DESC;",
        context: QueryGenerator
      }, {
        arguments: ['myTable', {group: "name"}],
        expectation: "SELECT * FROM \"myTable\" GROUP BY \"name\";",
        context: QueryGenerator
      }, {
        arguments: ['myTable', {group: ["name"]}],
        expectation: "SELECT * FROM \"myTable\" GROUP BY \"name\";",
        context: QueryGenerator
      }, {
        arguments: ['myTable', {group: ["name", "title"]}],
        expectation: "SELECT * FROM \"myTable\" GROUP BY \"name\", \"title\";",
        context: QueryGenerator
      }, {
        arguments: ['myTable', {group: "name", order: "id DESC"}],
        expectation: "SELECT * FROM \"myTable\" GROUP BY \"name\" ORDER BY \"id\" DESC;",
        context: QueryGenerator
      }, {
        arguments: ['myTable', {limit: 10}],
        expectation: "SELECT TOP 10 * FROM \"myTable\";",
        context: QueryGenerator
      }, {
        arguments: ['myTable', {limit: 10, offset: 2}],
        expectation: "WITH QUERYWITHROWS AS ( SELECT *, ROW_NUMBER() OVER(ORDER BY (SELECT TOP 1 c.[name] AS [Column Name] FROM syscolumns c inner join sysobjects t on c.id = t.id where t.[Name] = 'myTable')) AS 'RowNumber' FROM \"myTable\" ) SELECT * FROM QUERYWITHROWS WHERE RowNumber BETWEEN 2 AND 12;",
        context: QueryGenerator
      }, {
        title: 'ignores offset if no limit was passed',
        arguments: ['myTable', {offset: 2}],
        expectation: "SELECT * FROM \"myTable\";",
        context: QueryGenerator
      }, {
        title: 'multiple where arguments',
        arguments: ['myTable', {where: {boat: 'canoe', weather: 'cold'}}],
        expectation: "SELECT * FROM \"myTable\" WHERE \"myTable\".\"boat\"='canoe' AND \"myTable\".\"weather\"='cold';",
        context: QueryGenerator
      }, {
        title: 'no where arguments (object)',
        arguments: ['myTable', {where: {}}],
        expectation: "SELECT * FROM \"myTable\";",
        context: QueryGenerator
      }, {
        title: 'no where arguments (string)',
        arguments: ['myTable', {where: ''}],
        expectation: "SELECT * FROM \"myTable\";",
        context: QueryGenerator
      }, {
        title: 'no where arguments (null)',
        arguments: ['myTable', {where: null}],
        expectation: "SELECT * FROM \"myTable\";",
        context: QueryGenerator
      }
    ],

    insertQuery: [
      {
        arguments: ['myTable', {name: 'foo'}],
        expectation: "INSERT INTO \"myTable\" (\"name\") VALUES ('foo');"
      }, {
        arguments: ['myTable', {name: "foo';DROP TABLE myTable;"}],
        expectation: "INSERT INTO \"myTable\" (\"name\") VALUES ('foo\\';DROP TABLE myTable;');"
      }, {
        arguments: ['myTable', {name: 'foo', birthday: new Date(Date.UTC(2011, 2, 27, 10, 1, 55))}],
        expectation: "INSERT INTO \"myTable\" (\"name\",\"birthday\") VALUES ('foo','2011-03-27 10:01:55');"
      }, {
        arguments: ['myTable', {name: 'foo', foo: 1}],
        expectation: "INSERT INTO \"myTable\" (\"name\",\"foo\") VALUES ('foo',1);"
      }, {
        arguments: ['myTable', {name: 'foo', foo: 1, nullValue: null}],
        expectation: "INSERT INTO \"myTable\" (\"name\",\"foo\",\"nullValue\") VALUES ('foo',1,NULL);"
      }, {
        arguments: ['myTable', {name: 'foo', foo: 1, nullValue: null}],
        expectation: "INSERT INTO \"myTable\" (\"name\",\"foo\",\"nullValue\") VALUES ('foo',1,NULL);",
        context: {options: {omitNull: false}}
      }, {
        arguments: ['myTable', {name: 'foo', foo: 1, nullValue: null}],
        expectation: "INSERT INTO \"myTable\" (\"name\",\"foo\") VALUES ('foo',1);",
        context: {options: {omitNull: true}}
      }, {
        arguments: ['myTable', {name: 'foo', foo: 1, nullValue: undefined}],
        expectation: "INSERT INTO \"myTable\" (\"name\",\"foo\") VALUES ('foo',1);",
        context: {options: {omitNull: true}}
      }, {
        arguments: ['myTable', {foo: false}],
        expectation: "INSERT INTO \"myTable\" (\"foo\") VALUES (0);"
      }, {
        arguments: ['myTable', {foo: true}],
        expectation: "INSERT INTO \"myTable\" (\"foo\") VALUES (1);"
      }
    ],

    bulkInsertQuery: [
      {
        arguments: ['myTable', [{name: 'foo'}, {name: 'bar'}]],
        expectation: "INSERT INTO \"myTable\" (\"name\") VALUES ('foo'),('bar');"
      }, {
        arguments: ['myTable', [{name: "foo';DROP TABLE myTable;"}, {name: 'bar'}]],
        expectation: "INSERT INTO \"myTable\" (\"name\") VALUES ('foo\\';DROP TABLE myTable;'),('bar');"
      }, {
        arguments: ['myTable', [{name: 'foo', birthday: new Date(Date.UTC(2011, 2, 27, 10, 1, 55))}, {name: 'bar', birthday: new Date(Date.UTC(2012, 2, 27, 10, 1, 55))}]],
        expectation: "INSERT INTO \"myTable\" (\"name\",\"birthday\") VALUES ('foo','2011-03-27 10:01:55'),('bar','2012-03-27 10:01:55');"
      }, {
        arguments: ['myTable', [{name: 'foo', foo: 1}, {name: 'bar', foo: 2}]],
        expectation: "INSERT INTO \"myTable\" (\"name\",\"foo\") VALUES ('foo',1),('bar',2);"
      }, {
        arguments: ['myTable', [{name: 'foo', foo: 1, nullValue: null}, {name: 'bar', nullValue: null}]],
        expectation: "INSERT INTO \"myTable\" (\"name\",\"foo\",\"nullValue\") VALUES ('foo',1,NULL),('bar',NULL);"
      }, {
        arguments: ['myTable', [{name: 'foo', foo: 1, nullValue: null}, {name: 'bar', foo: 2, nullValue: null}]],
        expectation: "INSERT INTO \"myTable\" (\"name\",\"foo\",\"nullValue\") VALUES ('foo',1,NULL),('bar',2,NULL);",
        context: {options: {omitNull: false}}
      }, {
        arguments: ['myTable', [{name: 'foo', foo: 1, nullValue: null}, {name: 'bar', foo: 2, nullValue: null}]],
        expectation: "INSERT INTO \"myTable\" (\"name\",\"foo\",\"nullValue\") VALUES ('foo',1,NULL),('bar',2,NULL);",
        context: {options: {omitNull: true}} // Note: We don't honour this because it makes little sense when some rows may have nulls and others not
      }, {
        arguments: ['myTable', [{name: 'foo', foo: 1, nullValue: undefined}, {name: 'bar', foo: 2, undefinedValue: undefined}]],
        expectation: "INSERT INTO \"myTable\" (\"name\",\"foo\",\"nullValue\") VALUES ('foo',1,NULL),('bar',2,NULL);",
        context: {options: {omitNull: true}} // Note: As above
      }, {
        arguments: ['myTable', [{name: "foo", value: true}, {name: 'bar', value: false}]],
        expectation: "INSERT INTO \"myTable\" (\"name\",\"value\") VALUES ('foo',1),('bar',0);"
      }
    ],

    updateQuery: [
      {
        arguments: ['myTable', {name: 'foo', birthday: new Date(Date.UTC(2011, 2, 27, 10, 1, 55))}, {id: 2}],
        expectation: "UPDATE \"myTable\" SET \"name\"='foo',\"birthday\"='2011-03-27 10:01:55' WHERE \"id\"=2"
      }, {
        arguments: ['myTable', {name: 'foo', birthday: new Date(Date.UTC(2011, 2, 27, 10, 1, 55))}, 2],
        expectation: "UPDATE \"myTable\" SET \"name\"='foo',\"birthday\"='2011-03-27 10:01:55' WHERE \"id\"=2"
      }, {
        arguments: ['myTable', {bar: 2}, {name: 'foo'}],
        expectation: "UPDATE \"myTable\" SET \"bar\"=2 WHERE \"name\"='foo'"
      }, {
        arguments: ['myTable', {name: "foo';DROP TABLE myTable;"}, {name: 'foo'}],
        expectation: "UPDATE \"myTable\" SET \"name\"='foo\\';DROP TABLE myTable;' WHERE \"name\"='foo'"
      }, {
        arguments: ['myTable', {bar: 2, nullValue: null}, {name: 'foo'}],
        expectation: "UPDATE \"myTable\" SET \"bar\"=2,\"nullValue\"=NULL WHERE \"name\"='foo'"
      }, {
        arguments: ['myTable', {bar: 2, nullValue: null}, {name: 'foo'}],
        expectation: "UPDATE \"myTable\" SET \"bar\"=2,\"nullValue\"=NULL WHERE \"name\"='foo'",
        context: {options: {omitNull: false}}
      }, {
        arguments: ['myTable', {bar: 2, nullValue: null}, {name: 'foo'}],
        expectation: "UPDATE \"myTable\" SET \"bar\"=2 WHERE \"name\"='foo'",
        context: {options: {omitNull: true}}
      }, {
        arguments: ['myTable', {bar: false}, {name: 'foo'}],
        expectation: "UPDATE \"myTable\" SET \"bar\"=0 WHERE \"name\"='foo'"
      }, {
        arguments: ['myTable', {bar: true}, {name: 'foo'}],
        expectation: "UPDATE \"myTable\" SET \"bar\"=1 WHERE \"name\"='foo'"
      }
    ],

    deleteQuery: [
      {
        arguments: ['myTable', {name: 'foo'}],
        expectation: "DELETE TOP(1) FROM \"myTable\" WHERE \"name\"='foo'"
      }, {
        arguments: ['myTable', 1],
        expectation: "DELETE TOP(1) FROM \"myTable\" WHERE \"id\"=1"
      }, {
        arguments: ['myTable', 1, {limit: 10}],
        expectation: "DELETE TOP(10) FROM \"myTable\" WHERE \"id\"=1"
      }, {
        arguments: ['myTable', {name: "foo';DROP TABLE myTable;"}, {limit: 10}],
        expectation: "DELETE TOP(10) FROM \"myTable\" WHERE \"name\"='foo\\';DROP TABLE myTable;'"
      }, {
        arguments: ['myTable', {name: 'foo'}, {limit: null}],
        expectation: "DELETE FROM \"myTable\" WHERE \"name\"='foo'"
      }
    ],

//    addIndexQuery: [
//      {
//        arguments: ['User', ['username', 'isAdmin']],
//        expectation: 'CREATE INDEX user_username_is_admin ON User (username, isAdmin)'
//      }, {
//        arguments: [
//          'User', [
//            { attribute: 'username', length: 10, order: 'ASC'},
//            'isAdmin'
//          ]
//        ],
//        expectation: "CREATE INDEX user_username_is_admin ON User (username(10) ASC, isAdmin)"
//      }, {
//        arguments: [
//          'User', ['username', 'isAdmin'], { parser: 'foo', indicesType: 'FULLTEXT', indexName: 'bar'}
//        ],
//        expectation: "CREATE FULLTEXT INDEX bar ON User (username, isAdmin) WITH PARSER foo"
//      }
//    ],
//
//    showIndexQuery: [
//      {
//        arguments: ['User'],
//        expectation: 'SHOW INDEX FROM User'
//      }, {
//        arguments: ['User', { database: 'sequelize' }],
//        expectation: "SHOW INDEX FROM User FROM sequelize"
//      }
//    ],
//
//    removeIndexQuery: [
//      {
//        arguments: ['User', 'user_foo_bar'],
//        expectation: "DROP INDEX user_foo_bar ON User"
//      }, {
//        arguments: ['User', ['foo', 'bar']],
//        expectation: "DROP INDEX user_foo_bar ON User"
//      }
//    ],

    hashToWhereConditions: [
      {
        arguments: [{ id: [1,2,3] }],
        expectation: "\"id\" IN (1,2,3)"
      },
      {
        arguments: [{ id: [] }],
        expectation: "\"id\" IN (NULL)"
      },
      {
        arguments: [{ maple: false, bacon: true }],
        expectation: "\"maple\"=0 AND \"bacon\"=1"
      },
      {
        arguments: [{ beaver: [false, true] }],
        expectation: "\"beaver\" IN (0,1)"
      },
      {
        arguments: [{birthday: new Date(Date.UTC(2011, 6, 1, 10, 1, 55))}],
        expectation: "\"birthday\"='2011-07-01 10:01:55'"
      },
      {
        arguments: [{ birthday: new Date(Date.UTC(2011, 6, 1, 10, 1, 55)),
                      otherday: new Date(Date.UTC(2013, 6, 2, 10, 1, 22)) }],
        expectation: "\"birthday\"='2011-07-01 10:01:55' AND \"otherday\"='2013-07-02 10:01:22'"
      },
      {
        arguments: [{ birthday: [new Date(Date.UTC(2011, 6, 1, 10, 1, 55)), new Date(Date.UTC(2013, 6, 2, 10, 1, 22))] }],
        expectation: "\"birthday\" IN ('2011-07-01 10:01:55','2013-07-02 10:01:22')"
      }
    ]
  }

  Sequelize.Utils._.each(suites, function(tests, suiteTitle) {
    describe(suiteTitle, function() {
      tests.forEach(function(test) {
        var title = test.title || 'MSSQL correctly returns ' + test.expectation + ' for ' + util.inspect(test.arguments)
        it(title, function() {
          // Options would normally be set by the query interface that instantiates the query-generator, but here we specify it explicitly
          var context = test.context || {options: {}};
          var conditions = QueryGenerator[suiteTitle].apply(context, test.arguments)

          expect(conditions).toEqual(test.expectation)
        })
      })
    })
  })
})
