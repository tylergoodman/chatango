{ User } = require '..'
util = require 'util'

describe 'User', ->

  it 'correct endpoint url', ->
    (new User 'ttttestuser').ENDPOINT.should.equal 'http://ust.chatango.com/profileimg/t/t/ttttestuser'

  it 'parse anon names', ->
    User.parseAnonName '<n3953/>asd', '14396270'
      .should.equal 'anon9123'

  it 'authorize', (done) ->
    user = new User 'ttttestuser', 'asdf1234'
    user
      .authorize()
      .then ->
        cookies = user._cookies.getCookies 'http://st.chatango.com'
        cookies.should.be.Array.with.length 4
        cookies[2].should.containDeep {
          key: 'auth.chatango.com'
        }
        done()
      .catch done

  describe 'background style', ->
    it 'get', (done) ->
      new User 'ttttestuser'
        .getBackground()
        .then (background) ->
          background.align.should.equalOneOf 'tl', 'tr', 'bl', 'br'
          background.ialp.should.be.a.Number.within 0, 100
          background.tile.should.be.a.Number.within 0, 1
          background.bgalp.should.be.a.Number.within 0, 100
          background.bgc.should.be.a.String
          background.useimg.should.be.a.Number.within 0, 1
          background.hasrec.should.be.a.Number.within 0, 1
          background.isvid.should.be.a.Number.within 0, 1
          done()
        .catch done
    it 'set', (done) ->
      user = new User 'ttttestuser', 'asdf1234'
      bgc = util.hexColor()
      user
        .authorize()
        .then ->
          user.setBackground {
            bgc
          }
        .then (background) ->
          user.background.should.eql background
          background.bgc.should.equal bgc
          done()
        .catch done
    it 'set image', (done) ->
      user = new User 'ttttestuser', 'asdf1234'
      user
        .authorize()
        .then ->
          user.setBackgroundImage fs.createReadStream './test/Cute_Red_Panda_1152x2048.jpg'
        .then ->
          # pray
          done()
        .catch done

  describe 'message style', ->
    it 'get', (done) ->
      new User 'ttttestuser'
        .getStyle()
        .then (style) ->
          style.nameColor.should.be.a.String
          style.textColor.should.be.a.String
          style.fontSize.should.be.a.Number.within 9, 22
          style.fontFamily.should.be.a.String
          style.fontFamily.should.equalOneOf Message.Font
          style.bold.should.be.Boolean
          style.italics.should.be.Boolean
          style.underline.should.be.Boolean
          done()
        .catch done
    it 'set', (done) ->
      user = new User 'ttttestuser', 'asdf1234'
      nameColor = util.hexColor()
      user
        .authorize()
        .then ->
          user.setStyle {
            nameColor
          }
        .then (style) ->
          user.style.should.eql style
          style.nameColor.should.eql nameColor
          done()
        .catch done
