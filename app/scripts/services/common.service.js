'use strict';

angular.module('icestudio')
    .service('common', ['$rootScope', 'nodeFs', 'nodeGlob', 'window', 'graph', 'boards', 'utils',
      function($rootScope, nodeFs, nodeGlob, window, graph, boards, utils) {

        // Variables

        this.project = {};
        this.projectName = '';

        // Functions

        this.newProject = function(name) {
          this.project = {};
          this.updateProjectName(name);
          graph.clearAll();
          alertify.success('New project ' + name + ' created');
        };

        this.openProject = function(filepath) {
          $.ajaxSetup({ async: false });
          var project;
          $.getJSON(filepath, function(data){
            project = data;
          });
          if (project) {
            var name = utils.basename(filepath);
            this.updateProjectName(name);
            this.project = project;
            boards.selectBoard(project.board);
            graph.loadProject(project);
            alertify.success('Project ' + name + ' loaded');
          }
          $.ajaxSetup({ async: true });
        };

        this.saveProject = function(filepath) {
          var name = utils.basename(filepath);
          this.updateProjectName(name);
          this.refreshProject();
          nodeFs.writeFile(filepath, JSON.stringify(this.project, null, 2),
            function(err) {
              if (!err) {
                alertify.success('Project ' + name + ' saved');
              }
          });
        };

        this.importBlock = function(filepath) {
          $.ajaxSetup({ async: false });
          var block;
          $.getJSON(filepath, function(data){
            block = data;
          });
          if (block) {
            var name = utils.basename(filepath);
            graph.importBlock(name, block);
            // TODO: Check unique add
            this.project.deps[name] = block;
            alertify.success('Block ' + name + ' imported');
          }
          $.ajaxSetup({ async: true });
        };

        this.exportAsBlock = function(filepath) {
          var name = utils.basename(filepath);
          this.refreshProject();
          // Convert project to block
          var block = angular.copy(this.project);
          delete block.board;
          for (var i in block.graph.blocks) {
            if (block.graph.blocks[i].type == 'basic.input' ||
                block.graph.blocks[i].type == 'basic.output') {
              delete block.graph.blocks[i].data.value;
            }
          }
          nodeFs.writeFile(filepath, JSON.stringify(block, null, 2),
            function(err) {
              if (!err) {
                alertify.success('Block exported as ' + name);
              }
          });
        };

        this.refreshProject = function() {
          var graphData = graph.toJSON();

          var blocks = [];
          var wires = [];

          for (var c = 0; c < graphData.cells.length; c++) {
            var cell = graphData.cells[c];

            if (cell.type == 'ice.Block' || cell.type == 'ice.IO' || cell.type == 'ice.Code') {
              var block = {};
              block.id = cell.id;
              block.type = cell.blockType;
              block.data = cell.data;
              block.position = cell.position;
              if (cell.type == 'ice.Code') {
                block.data.code = graph.getCode(cell.id);
              }
              blocks.push(block);
            }
            else if (cell.type == 'ice.Wire') {
              var wire = {};
              wire.source = { block: cell.source.id, port: cell.source.port };
              wire.target = { block: cell.target.id, port: cell.target.port };
              wires.push(wire);
            }
          }

          this.project.board = boards.selectedBoard.id;

          this.project.graph = { blocks: blocks, wires: wires };

          this.project.deps = this.dependencies;
        };

        this.clearProject = function() {
          graph.breadcrumb = [ { id: '', name: this.projectName }];
        }

        this.updateProjectName = function(name) {
          if (name) {
            this.projectName = name
            graph.breadcrumb[0].name = name;
            window.title = 'Icestudio - ' + name;
            if(!$rootScope.$$phase) {
              $rootScope.$apply();
            }
          }
        }

        // Intialize project
        this.updateProjectName('untitled');

    }]);
